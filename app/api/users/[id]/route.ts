import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    if (user && user.email === DEV_EMAIL) {
      return NextResponse.json(
        { message: 'Developer account cannot be deleted' },
        { status: 400 }
      );
    }

    await prisma.adminUser.delete({ where: { id: params.id } });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
