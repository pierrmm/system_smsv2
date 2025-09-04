import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validasi input
    if (!email || !password) {
      return NextResponse.json(
        { error: { message: 'Email dan password harus diisi', type: 'validation' } },
        { status: 400 }
      );
    }

    // Cari user berdasarkan email
    const user = await prisma.adminUser.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { error: { message: 'Email tidak ditemukan', type: 'email' } },
        { status: 401 }
      );
    }

    // Verifikasi password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: { message: 'Password salah', type: 'password' } },
        { status: 401 }
      );
    }

    // Cek apakah user aktif
    if (!user.is_active) {
      return NextResponse.json(
        { error: { message: 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.', type: 'account' } },
        { status: 401 }
      );
    }

    // Return user data (tanpa password)
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({ user: userWithoutPassword });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: { message: 'Terjadi kesalahan server', type: 'server' } },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
