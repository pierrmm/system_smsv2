import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

function formatDateFull(value: any): string {
  const d = toDateSafe(value);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function wrapText(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + ' ' + word).length <= maxLength) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function escapePdfText(t: string) {
return t.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]): Uint8Array {
  const header = '%PDF-1.4\n';
  const objects: string[] = [];

  // 1 Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  // 2 Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');

  // 3 Page
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>\nendobj');

  // 4 Content stream with better formatting
  const streamCommands: string[] = [];
  let yPosition = 750;
  
  lines.forEach((line, index) => {
    const isTitle = index === 0;
    const isHeader = line.includes('Informasi Surat') || line.includes('Daftar Peserta:') || line.includes('Tanda Tangan Elektronik Sistem') || line.includes('INFORMASI VALIDASI:');
    const isEmpty = line.trim() === '';
    
    if (isEmpty) {
      yPosition -= 8; // Smaller spacing for empty lines
      return;
    }
    
    if (isTitle) {
      // Title - larger, bold, centered
      streamCommands.push(`BT /F2 16 Tf 306 ${yPosition} Td (${escapePdfText(line)}) Tj ET`);
      yPosition -= 25;
    } else if (isHeader) {
      // Section headers - bold, slightly larger
      streamCommands.push(`BT /F2 12 Tf 50 ${yPosition} Td (${escapePdfText(line)}) Tj ET`);
      yPosition -= 18;
    } else {
      // Regular text
      streamCommands.push(`BT /F1 10 Tf 50 ${yPosition} Td (${escapePdfText(line)}) Tj ET`);
      yPosition -= 14;
    }
  });
  
  const streamData = streamCommands.join(' ');
  objects.push(`4 0 obj\n<< /Length ${streamData.length} >>\nstream\n${streamData}\nendstream\nendobj`);
  
  // 5 Regular Font
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  
  // 6 Bold Font
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');

  // Build xref table
  let offset = header.length;
  const offsets: number[] = [0];
  
  const body = objects
    .map((obj, index) => {
      offsets.push(offset);
      const objString = obj + '\n';
      offset += objString.length;
      return objString;
    })
    .join('');

  const xrefStart = offset;
  const xrefLines = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f '
  ];
  
  for (let i = 1; i < offsets.length; i++) {
    xrefLines.push(offsets[i].toString().padStart(10, '0') + ' 00000 n ');
  }
  
  const xrefSection = xrefLines.join('\n') + '\n';
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  
  const pdfString = header + body + xrefSection + trailer;
  return new TextEncoder().encode(pdfString);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const letter = await prisma.permissionLetter.findUnique({
      where: { id },
      include: { participants: true }
    });

    if (!letter) {
      return new Response(JSON.stringify({ error: 'Surat tidak ditemukan' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (letter.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Surat belum disetujui' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // PENTING: Gunakan logika yang sama dengan verifikasi
    const approvedRefDate = letter.approved_at ? toDateSafe(letter.approved_at) : toDateSafe(letter.created_at);
    const sig = hmacSignature(letter.id, approvedRefDate);
    const validationCode = sig.slice(0, 16).toUpperCase();

    console.log('PDF Generation - Letter ID:', letter.id); // Debug
    console.log('PDF Generation - Date used:', approvedRefDate.toISOString()); // Debug
    console.log('PDF Generation - Validation code:', validationCode); // Debug

    const lines: string[] = [];
    const push = (t = '') => lines.push(t);

    // Header with better formatting
    push('SURAT IZIN / KETERANGAN');
    push('');
    push(`Nomor Surat      : ${letter.letter_number}`);
    push(`Tanggal Pembuatan: ${formatDateFull(letter.created_at)}`);
    push('');
    push('');
    
    // Information section
    push('Informasi Surat');
    push('-'.repeat(50));
    push(`Jenis Surat      : ${letter.letter_type.toUpperCase()}`);
    push(`Kegiatan         : ${letter.activity}`);
    push(`Lokasi           : ${letter.location}`);
    push(`Tanggal Kegiatan : ${formatDateFull(letter.date)}`);
    push(`Waktu            : ${letter.time_start} - ${letter.time_end} WIB`);
    
    if (letter.reason) {
      push('');
      push('Keterangan:');
      wrapText(letter.reason, 70).forEach(line => push(`  ${line}`));
    }
    
    push('');
    push('');
    
    // Participants section
    push('Daftar Peserta:');
    push('-'.repeat(50));
    if (!letter.participants.length) {
      push('  (Tidak ada peserta terdaftar)');
    } else {
      letter.participants.forEach((p, i) => {
        const no = String(i + 1).padStart(2, '0');
        push(`  ${no}. ${p.name.padEnd(25)} - ${p.class}`);
      });
    }
    
    push('');
    push('');
    
    // Digital signature section
    push('Tanda Tangan Elektronik Sistem');
    push('-'.repeat(50));
    push(`Status           : DISETUJUI`);
    push(`Tanggal Persetujuan: ${letter.approved_at ? formatDateFull(letter.approved_at) : formatDateFull(letter.created_at)}`);
    push(`Kode Validasi    : ${validationCode}`); // Tampilkan kode lengkap 16 karakter
    push('');
    push('');
    
    // Footer information
    push('INFORMASI VALIDASI:');
    push('- Kode validasi dihasilkan otomatis menggunakan HMAC-SHA256');
    push('- Perubahan isi dokumen akan membuat kode tidak valid');
    push('- Untuk verifikasi, cocokkan kode dengan sistem menggunakan nomor surat');
    push('- Masukkan 16 karakter kode validasi di atas untuk verifikasi');
    push('');
    push(`Dokumen ini digenerate secara otomatis pada ${new Date().toLocaleString('id-ID')}`);

    const pdfBytes = buildSimplePdf(lines);

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBytes.length),
        'Content-Disposition': `attachment; filename="Surat-${letter.letter_number.replace(/\//g, '_')}.pdf"`
      }
    });
  } catch (e) {
    console.error('PDF Generation Error:', e);
    return new Response(JSON.stringify({ error: 'PDF_GENERATION_FAILED' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}