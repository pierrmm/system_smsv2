import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// GET - Fetch single permission letter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await params sebelum menggunakan
    
    const letter = await prisma.permissionLetter.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
        },
        participants: true
      }
    });

    if (!letter) {
      return NextResponse.json(
        { message: 'Surat tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(letter);
  } catch (error) {
    console.error('Error fetching permission letter:', error);
    return NextResponse.json(
      { message: 'Gagal mengambil data surat' },
      { status: 500 }
    );
  }
}

// PUT - Update permission letter
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await params sebelum menggunakan
    const body = await request.json();
    const { activity, location, date, time_start, time_end, letter_type, reason, participants } = body;

    // Check if letter exists
    const existingLetter = await prisma.permissionLetter.findUnique({
      where: { id }
    });

    if (!existingLetter) {
      return NextResponse.json(
        { message: 'Surat tidak ditemukan' },
        { status: 404 }
      );
    }

    // Update letter and participants in transaction
    const updatedLetter = await prisma.$transaction(async (tx) => {
      // Update the letter
      const letter = await tx.permissionLetter.update({
        where: { id },
        data: {
          activity,
          location,
          date: new Date(date),
          time_start,
          time_end,
          letter_type,
          reason: reason || null,
          updated_at: new Date()
        }
      });

      // Delete existing participants
      await tx.permissionParticipant.deleteMany({
        where: { permission_letter_id: id }
      });

      // Create new participants
      if (participants && participants.length > 0) {
        await tx.permissionParticipant.createMany({
          data: participants.map((participant: any) => ({
            permission_letter_id: id,
            name: participant.name,
            class: participant.class
          }))
        });
      }

      return letter;
    });

    // Fetch updated letter with relations
    const letterWithRelations = await prisma.permissionLetter.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
        },
        participants: true
      }
    });

    return NextResponse.json(letterWithRelations);
  } catch (error) {
    console.error('Error updating permission letter:', error);
    return NextResponse.json(
      { message: 'Gagal mengupdate surat' },
      { status: 500 }
    );
  }
}

// DELETE - Delete permission letter
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if letter exists
    const existingLetter = await prisma.permissionLetter.findUnique({
      where: { id: params.id }
    });

    if (!existingLetter) {
      return NextResponse.json(
        { message: 'Surat tidak ditemukan' },
        { status: 404 }
      );
    }

    // Delete letter (participants will be deleted automatically due to cascade)
    await prisma.permissionLetter.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Surat berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting permission letter:', error);
    return NextResponse.json(
      { message: 'Gagal menghapus surat' },
      { status: 500 }
    );
  }
}