import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const letter = await prisma.permissionLetter.findUnique({
      where: { id: params.id },
      include: {
        participants: true,
      },
    });

    if (!letter) {
      return NextResponse.json(
        { message: 'Letter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(letter);
  } catch (error) {
    console.error('Error fetching permission letter:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, approved_by } = body;

    const letter = await prisma.permissionLetter.update({
      where: { id: params.id },
      data: {
        status,
        approved_by,
        approved_at: new Date(),
      },
      include: {
        participants: true,
      },
    });

    return NextResponse.json(letter);
  } catch (error) {
    console.error('Error updating permission letter:', error);
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
    await prisma.permissionLetter.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Letter deleted successfully' });
  } catch (error) {
    console.error('Error deleting permission letter:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}