import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { letter_number: { contains: search, mode: 'insensitive' } },
        { activity: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { creator: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (type) {
      where.letter_type = type;
    }

    if (status) {
      where.status = status;
    }

    const letters = await prisma.permissionLetter.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        participants: true,
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({ letters });
  } catch (error) {
    console.error('Error fetching letters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letters' },
      { status: 500 }
    );
  }
}

// Utility: generate next letter number safely
async function generateNextLetterNumber(prisma, prefix = 'IZIN') {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  // Ambil nomor terakhir bulan ini
  const last = await prisma.permissionLetter.findFirst({
    where: {
      letter_number: {
        contains: `/${prefix}/${month}/${year}`
      }
    },
    orderBy: { created_at: 'desc' } // atau updated_at tergantung schema
  });
  let nextSeq = 1;
  if (last?.letter_number) {
    const m = last.letter_number.match(/^(\d{3})\/.+/);
    if (m) nextSeq = Number(m[1]) + 1;
  }
  return { seq: nextSeq, month, year, prefix };
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
      participants = [],
      created_by,
      status
    } = body;

    if (!date || !time_start || !time_end || !location || !activity || !letter_type) {
      return new Response(
        JSON.stringify({ error: 'Field wajib belum lengkap' }),
        { status: 400 }
      );
    }

    const MAX_RETRY = 5;
    let attempt = 0;
    let created;

    while (attempt < MAX_RETRY) {
      const { seq, month, year, prefix } = await generateNextLetterNumber(prisma);
      const letter_number = `${String(seq).padStart(3, '0')}/${prefix}/${month}/${year}`;
      try {
        created = await prisma.permissionLetter.create({
          data: {
            letter_number,
            date: new Date(date),
            time_start,
            time_end,
            location,
            activity,
            letter_type,
            reason,
            status: status || 'pending',
            created_by,
            participants: {
              create: participants
                .filter(p => p.name && p.class)
                .map(p => ({ name: p.name, class: p.class }))
            }
          },
          include: { participants: true }
        });
        break; // sukses
      } catch (e: any) {
        if (e.code === 'P2002' && e.meta?.target?.includes('letter_number')) {
          attempt++;
          if (attempt >= MAX_RETRY) {
            return new Response(
              JSON.stringify({ error: 'Gagal menghasilkan nomor unik, coba lagi.' }),
              { status: 500 }
            );
          }
          // lanjut retry
        } else {
          throw e;
        }
      }
    }

    return new Response(JSON.stringify(created), { status: 201 });
  } catch (e: any) {
    console.error('Error creating letter:', e);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}