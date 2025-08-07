import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { activity: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { letter_type: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    const [letters, total] = await Promise.all([
      prisma.permissionLetter.findMany({
        where,
        include: {
          participants: true,
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.permissionLetter.count({ where })
    ]);

    return NextResponse.json({
      letters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching permission letters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permission letters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      date,
      time_start,
      time_end,
      location,
      activity,
      letter_type,
      reason,
      participants,
      created_by
    } = body;

    // Validasi data
    if (!date || !time_start || !time_end || !location || !activity || !letter_type) {
      return NextResponse.json(
        { error: 'Semua field wajib harus diisi' },
        { status: 400 }
      );
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { error: 'Minimal harus ada satu peserta' },
        { status: 400 }
      );
    }

    // Generate nomor surat
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const lastLetter = await prisma.permissionLetter.findFirst({
      where: {
        created_at: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1)
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    let nextNumber = 1;
    if (lastLetter && lastLetter.letter_number) {
      const match = lastLetter.letter_number.match(/(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const letterNumber = `${nextNumber.toString().padStart(3, '0')}/IZIN/${currentMonth.toString().padStart(2, '0')}/${currentYear}`;

    // Simpan surat izin
    const permissionLetter = await prisma.permissionLetter.create({
      data: {
        letter_number: letterNumber,
        date: new Date(date),
        time_start,
        time_end,
        location,
        activity,
        letter_type,
        reason: reason || '',
        status: 'pending',
        created_by: created_by || 'system', // Gunakan created_by dari request
        participants: {
          create: participants.map((participant: any) => ({
            name: participant.name,
            class: participant.class
          }))
        }
      },
      include: {
        participants: true
      }
    });

    return NextResponse.json(permissionLetter, { status: 201 });
  } catch (error) {
    console.error('Error creating permission letter:', error);
    return NextResponse.json(
      { error: 'Gagal menyimpan surat izin' },
      { status: 500 }
    );
  }
}