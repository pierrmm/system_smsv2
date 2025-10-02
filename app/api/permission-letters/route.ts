import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const createdBy = searchParams.get('created_by') || '';
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || searchParams.get('limit') || '50')));

    const where: any = {};

    if (search) {
      where.OR = [
        { letter_number: { contains: search, mode: 'insensitive' } },
        { activity: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        // relational filter to creator name
        { creator: { is: { name: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    if (type) {
      where.letter_type = type;
    }

    if (status) {
      where.status = status;
    }

    if (createdBy) {
      where.created_by = createdBy;
    }
    const [total, letters] = await prisma.$transaction([
      prisma.permissionLetter.count({ where }),
      prisma.permissionLetter.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: { select: { participants: true } },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        participants: true // Pastikan ini ada
      },
      orderBy: {
        created_at: 'desc'
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    ]);

    return NextResponse.json({ letters, total, page, pageSize });
  } catch (error) {
    console.error('Error fetching letters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letters' },
      { status: 500 }
    );
  }
}

// Map jenis surat ke prefix nomor surat
const LETTER_TYPE_PREFIX_MAP: Record<string, string> = {
  dispensasi: 'DISPENSASI',
  keterangan: 'KETERANGAN',
  surat_tugas: 'SURAT_TUGAS',
  lomba: 'LOMBA'
};

function getLetterPrefix(letterType?: string | null) {
  if (!letterType) return 'IZIN';
  const normalized = letterType.trim().toLowerCase();
  if (!normalized) return 'IZIN';
  if (LETTER_TYPE_PREFIX_MAP[normalized]) {
    return LETTER_TYPE_PREFIX_MAP[normalized];
  }
  const sanitized = normalized.replace(/[^a-z0-9]+/g, '_');
  return sanitized ? sanitized.toUpperCase() : 'IZIN';
}

// Utility: generate next letter number safely
async function generateNextLetterNumber(prisma, letterType?: string) {
  const prefix = getLetterPrefix(letterType);
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
      date_start,
      date_end,
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

    const effectiveDate = date_start || date;

    if (!effectiveDate || !time_start || !time_end || !location || !activity || !letter_type) {
      return new Response(JSON.stringify({ error: 'Field wajib belum lengkap' }), { status: 400 });
    }

    const MAX_RETRY_UNIQUE = 5;
    const MAX_ADAPT_ATTEMPTS = 5; // batas adaptasi schema
    let attempt = 0;
    let adaptAttempts = 0;
    let created: any = null;

    let supportsRangeDates = true;
    let supportsParticipantReason = true;

    const META_PREFIX = '__META__:';

    while (attempt < MAX_RETRY_UNIQUE && adaptAttempts < MAX_ADAPT_ATTEMPTS) {
      const { seq, month, year, prefix } = await generateNextLetterNumber(prisma, letter_type);
      const letter_number = `${String(seq).padStart(3, '0')}/${prefix}/${month}/${year}`;

      // Kumpulkan meta fallback
      const meta: any = {};

      // Build participants create data (sementara, bisa disesuaikan jika kolom reason tidak ada)
      const participantCreate = participants
        .filter((p: any) => p.name && p.class)
        .map((p: any) => {
          const base: any = { name: p.name, class: p.class };
          const r = (p.reason ?? '').toString().trim();
          if (supportsParticipantReason) {
            if (r) base.reason = r;
          } else if (r) {
            if (!meta.participants) meta.participants = [];
            meta.participants.push({ name: p.name, reason: r });
          }
          return base;
        });

      // Data surat
      let baseReason = reason ?? '';
      const data: any = {
        letter_number,
        date: new Date(effectiveDate),
        time_start,
        time_end,
        location,
        activity,
        letter_type,
        status: status || 'pending',
        created_by,
        participants: { create: participantCreate }
      };

      if (supportsRangeDates) {
        if (date_start) data.date_start = new Date(date_start);
        if (date_end && date_end !== date_start) data.date_end = new Date(date_end);
      } else if (date_start && date_end && date_end !== date_start) {
        meta.date_range = { start: date_start, end: date_end };
      }

      // Sisipkan meta bila diperlukan (saat schema tidak mendukung kolom terkait)
      if (Object.keys(meta).length) {
        const metaLine = META_PREFIX + JSON.stringify(meta);
        baseReason = baseReason ? `${baseReason}\n${metaLine}` : metaLine;
      }
      if (baseReason) data.reason = baseReason;

      try {
        created = await prisma.permissionLetter.create({
          data,
          include: { participants: true }
        });
        break;
      } catch (e: any) {
        const msg = (e.message || '').toLowerCase();

        if (e.code === 'P2002' && e.meta?.target?.includes('letter_number')) {
          attempt++;
          continue;
        }

        if (supportsRangeDates &&
            (msg.includes('unknown argument `date_start`') || msg.includes('unknown argument `date_end`'))) {
          console.warn('[PermissionLetter] Kolom date_start/date_end belum ada. Fallback ke meta.');
          supportsRangeDates = false;
          adaptAttempts++;
          continue;
        }

        if (supportsParticipantReason && msg.includes('unknown argument `reason`')) {
          console.warn('[PermissionLetter] Kolom reason peserta belum ada. Fallback meta participants.');
          supportsParticipantReason = false;
          adaptAttempts++;
          continue;
        }

        if (e.code === 'P2003') {
          return new Response(JSON.stringify({ error: 'Relasi tidak valid (P2003).' }), { status: 400 });
        }

        console.error('Error creating letter (fatal):', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
      }
    }

    if (!created) {
      const reason =
        adaptAttempts >= MAX_ADAPT_ATTEMPTS
          ? 'Adaptasi schema gagal. Pastikan kolom date_start, date_end, reason peserta sudah dimigrate.'
          : 'Pembuatan surat gagal.';
      return new Response(JSON.stringify({ error: reason }), { status: 500 });
    }

    return new Response(JSON.stringify(created), { status: 201 });
  } catch (e: any) {
    console.error('Error creating letter (outer):', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
