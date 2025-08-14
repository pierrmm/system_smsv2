import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function hmacSignature(letterId: string, date: Date): string {
  const secret = process.env.HMAC_SECRET || 'default-secret-key';
  const data = `${letterId}-${date.toISOString()}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function toDateSafe(value: any): Date {
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

export async function POST(req: NextRequest) {
  try {
    const { letterNumber, validationCode } = await req.json();
    
    console.log('Verifying:', { letterNumber, validationCode }); // Debug log
    
    if (!letterNumber || !validationCode) {
      return Response.json({ 
        valid: false, 
        message: 'Nomor surat dan kode validasi harus diisi' 
      }, { status: 400 });
    }
    
    // Cari surat berdasarkan nomor - PERBAIKI RELASI
    const letter = await prisma.permissionLetter.findFirst({
      where: { 
        letter_number: letterNumber.trim(),
        status: 'approved'
      },
      include: {
        participants: true,
        // Gunakan relasi yang benar sesuai schema Prisma
        creator: {
          select: { name: true }
        },
        approver: {
          select: { name: true }
        }
      }
    });
    
    if (!letter) {
      return Response.json({ 
        valid: false, 
        message: 'Nomor surat tidak ditemukan atau belum disetujui' 
      });
    }
    
    // Hitung HMAC yang seharusnya - gunakan logika yang sama dengan PDF
    const approvedRefDate = letter.approved_at ? toDateSafe(letter.approved_at) : toDateSafe(letter.created_at);
    const expectedSignature = hmacSignature(letter.id, approvedRefDate);
    const expectedCode = expectedSignature.slice(0, 16).toUpperCase();
    
    console.log('Expected code:', expectedCode); // Debug log
    console.log('Input code:', validationCode.replace(/\s/g, '').toUpperCase()); // Debug log
    console.log('Letter ID:', letter.id); // Debug log
    console.log('Date used:', approvedRefDate.toISOString()); // Debug log
    
    // Bandingkan dengan kode yang diinput
    const inputCode = validationCode.replace(/\s/g, '').toUpperCase();
    const isValid = expectedCode === inputCode;
    
    return Response.json({
      valid: isValid,
      message: isValid ? 'Dokumen valid dan asli' : 'Kode validasi tidak cocok - dokumen mungkin telah diubah atau dipalsukan',
      letterInfo: isValid ? {
        letterNumber: letter.letter_number,
        activity: letter.activity,
        location: letter.location,
        date: letter.date,
        letterType: letter.letter_type,
        status: letter.status,
        participantCount: letter.participants.length,
        createdBy: letter.creator?.name,
        approvedBy: letter.approver?.name,
        approvedAt: letter.approved_at,
        createdAt: letter.created_at
      } : undefined
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    return Response.json({ 
      valid: false, 
      message: 'Terjadi kesalahan dalam verifikasi dokumen' 
    }, { status: 500 });
  }
}