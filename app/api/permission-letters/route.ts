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

    // Generate letter number
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    // Count letters this month to generate sequential number
    const letterCount = await prisma.permissionLetter.count({
      where: {
        created_at: {
          gte: new Date(year, today.getMonth(), 1),
          lt: new Date(year, today.getMonth() + 1, 1)
        }
      }
    });

    const letterNumber = `${String(letterCount + 1).padStart(3, '0')}/IZIN/${month}/${year}`;

    // Create letter with participants
    const letter = await prisma.permissionLetter.create({
      data: {
        letter_number: letterNumber,
        date: new Date(date),
        time_start,
        time_end,
        location,
        activity,
        letter_type,
        reason,
        status: 'pending',
        created_by,
        participants: {
          create: participants.map((participant: any) => ({
            name: participant.name,
            class: participant.class
          }))
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        participants: true
      }
    });

    return NextResponse.json({ letter });
  } catch (error) {
    console.error('Error creating letter:', error);
    return NextResponse.json(
      { error: 'Failed to create letter' },
      { status: 500 }
    );
  }
}