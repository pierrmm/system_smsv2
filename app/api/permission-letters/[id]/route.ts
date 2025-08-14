import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: { id: string } };

const includeRelations = {
  creator: { select: { id: true, name: true, email: true } },
  approver: { select: { id: true, name: true, email: true } },
  participants: true
};

function parseDate(value: any) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// GET - Fetch single permission letter
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params; // Add await here
    const letter = await prisma.permissionLetter.findUnique({
      where: { id },
      include: includeRelations
    });

    if (!letter) {
      return NextResponse.json({ message: 'Surat tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(letter);
  } catch (error) {
    console.error('Error fetching permission letter:', error);
    return NextResponse.json({ message: 'Gagal mengambil data surat' }, { status: 500 });
  }
}

// PATCH - Partial update (status OR sebagian field)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const body = await req.json();

    const existing = await prisma.permissionLetter.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Surat tidak ditemukan' }, { status: 404 });
    }

    const {
      status,
      approved_by,
      activity,
      location,
      date,
      time_start,
      time_end,
      letter_type,
      reason,
      participants
    } = body;

    const data: any = { updated_at: new Date() };

    // Status update
    if (status && ['approved', 'rejected', 'pending'].includes(status)) {
      data.status = status;
      if (status === 'approved' || status === 'rejected') {
        data.approved_at = new Date();
        if (approved_by) data.approved_by = approved_by;
      } else {
        // revert approved info if set back to pending
        data.approved_at = null;
        data.approved_by = null;
      }
    }

    // Optional field changes
    if (activity !== undefined) data.activity = activity;
    if (location !== undefined) data.location = location;
    if (date !== undefined) {
      const d = parseDate(date);
      if (d) data.date = d;
    }
    if (time_start !== undefined) data.time_start = time_start;
    if (time_end !== undefined) data.time_end = time_end;
    if (letter_type !== undefined) data.letter_type = letter_type;
    if (reason !== undefined) data.reason = reason || null;

    let updated;
    const participantsProvided = Object.prototype.hasOwnProperty.call(body, 'participants');

    if (participantsProvided && Array.isArray(participants)) {
      // Update with participants inside transaction
      updated = await prisma.$transaction(async (tx) => {
        const letter = await tx.permissionLetter.update({
          where: { id },
          data
        });

        await tx.permissionParticipant.deleteMany({
          where: { permission_letter_id: id }
        });

        if (participants.length > 0) {
          await tx.permissionParticipant.createMany({
            data: participants.map((p: any) => ({
              permission_letter_id: id,
              name: p.name,
              class: p.class
            }))
          });
        }

        return letter;
      });
    } else {
      updated = await prisma.permissionLetter.update({
        where: { id },
        data
      });
    }

    const letterWithRelations = await prisma.permissionLetter.findUnique({
      where: { id },
      include: includeRelations
    });

    return NextResponse.json(letterWithRelations);
  } catch (error) {
    console.error('Error patching permission letter:', error);
    return NextResponse.json({ message: 'Gagal memperbarui surat' }, { status: 500 });
  }
}

// PUT - Full update (struktur utama + participants + status)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params; // Add await here
    const body = await req.json();
    const {
      activity,
      location,
      date,
      time_start,
      time_end,
      letter_type,
      reason,
      participants,
      status,
      approved_by
    } = body;

    const existingLetter = await prisma.permissionLetter.findUnique({ where: { id } });
    if (!existingLetter) {
      return NextResponse.json({ message: 'Surat tidak ditemukan' }, { status: 404 });
    }

    const data: any = {
      updated_at: new Date()
    };

    // Optional field changes
    if (activity !== undefined) data.activity = activity;
    if (location !== undefined) data.location = location;
    if (date !== undefined) {
      const d = parseDate(date);
      if (d) data.date = d;
    }
    if (time_start !== undefined) data.time_start = time_start;
    if (time_end !== undefined) data.time_end = time_end;
    if (letter_type !== undefined) data.letter_type = letter_type;
    if (reason !== undefined) data.reason = reason || null;

    // Status update
    if (status && ['approved', 'rejected', 'pending'].includes(status)) {
      data.status = status;
      if (status === 'approved' || status === 'rejected') {
        data.approved_at = new Date();
        if (approved_by) data.approved_by = approved_by;
      } else {
        data.approved_at = null;
        data.approved_by = null;
      }
    }

    const participantsProvided = Object.prototype.hasOwnProperty.call(body, 'participants');

    await prisma.$transaction(async (tx) => {
      await tx.permissionLetter.update({
        where: { id },
        data
      });

      if (participantsProvided) {
        await tx.permissionParticipant.deleteMany({
          where: { permission_letter_id: id }
        });
        if (Array.isArray(participants) && participants.length > 0) {
          await tx.permissionParticipant.createMany({
            data: participants.map((p: any) => ({
              permission_letter_id: id,
              name: p.name,
              class: p.class
            }))
          });
        }
      }
    });

    const letterWithRelations = await prisma.permissionLetter.findUnique({
      where: { id },
      include: includeRelations
    });

    return NextResponse.json(letterWithRelations);
  } catch (error) {
    console.error('Error updating permission letter:', error);
    return NextResponse.json({ message: 'Gagal mengupdate surat' }, { status: 500 });
  }
}

// DELETE - Delete permission letter
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    const existingLetter = await prisma.permissionLetter.findUnique({ where: { id } });
    if (!existingLetter) {
      return NextResponse.json({ message: 'Surat tidak ditemukan' }, { status: 404 });
    }

    await prisma.permissionLetter.delete({ where: { id } });

    return NextResponse.json({ message: 'Surat berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting permission letter:', error);
    return NextResponse.json({ message: 'Gagal menghapus surat' }, { status: 500 });
  }
}