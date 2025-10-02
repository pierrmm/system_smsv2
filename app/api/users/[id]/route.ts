import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, email, password, role, is_active } = body;

    // Validasi input
    if (!name || !email || !role) {
      return NextResponse.json(
        { message: 'Name, email, dan role wajib diisi' },
        { status: 400 }
      );
    }

    // Cek apakah email sudah digunakan oleh user lain
    const existingUser = await prisma.adminUser.findFirst({
      where: {
        email,
        NOT: {
          id: params.id
        }
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email sudah digunakan' },
        { status: 400 }
      );
    }

    // Prepare data untuk update
    const updateData: any = {
      name,
      email,
      role,
      is_active: Boolean(is_active)
    };

    // Jika password diisi, hash dan tambahkan ke updateData
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Update user
    const updatedUser = await prisma.adminUser.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const DEV_EMAIL = process.env.DEV_ADMIN_EMAIL || 'developer@system.local';

    const user = await prisma.adminUser.findUnique({ where: { id: params.id } });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if (user.email === DEV_EMAIL) {
      return NextResponse.json(
        { message: 'Developer account cannot be deleted' },
        { status: 400 }
      );
    }

    const fallbackOwner = await prisma.adminUser.findUnique({
      where: { email: DEV_EMAIL },
      select: { id: true }
    });

    if (!fallbackOwner) {
      console.error('Developer fallback account is missing');
      return NextResponse.json(
        { message: 'Unable to delete user: fallback account missing' },
        { status: 500 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.permissionLetter.updateMany({
        where: { approved_by: params.id },
        data: {
          approved_by: null,
          approved_at: null
        }
      });

      await tx.letter.updateMany({
        where: { approved_by: params.id },
        data: { approved_by: null }
      });

      if (fallbackOwner.id !== params.id) {
        await tx.permissionLetter.updateMany({
          where: { created_by: params.id },
          data: { created_by: fallbackOwner.id }
        });

        await tx.letter.updateMany({
          where: { created_by: params.id },
          data: { created_by: fallbackOwner.id }
        });
      } else {
        console.warn('Fallback owner is the same as user being deleted, cleaning up owned letters.');
        await tx.permissionLetter.deleteMany({ where: { created_by: params.id } });
        await tx.letter.deleteMany({ where: { created_by: params.id } });
      }

      await tx.adminUser.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        { message: 'User cannot be deleted because related records still exist' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
