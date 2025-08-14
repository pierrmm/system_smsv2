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

  // 4 Content stream - layout sederhana dan rapi
  const streamCommands: string[] = [];
  let yPosition = 720;
  const leftMargin = 60;
  const pageWidth = 612;
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    const isTitle = index === 0;
    const isHeader = trimmedLine.includes('Informasi Surat') || 
                    trimmedLine.includes('Daftar Peserta:') || 
                    trimmedLine.includes('Tanda Tangan Elektronik Sistem') ||
                    trimmedLine.includes('INFORMASI VALIDASI:');
    const isSeparator = trimmedLine.match(/^[-─]+$/);
    const isEmpty = trimmedLine === '';
    const isFieldValue = trimmedLine.includes(' : ');
    const isListItem = trimmedLine.match(/^\s*\d+\./);
    const isBulletPoint = trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ');
    const isIndented = trimmedLine.startsWith('  ');
    
    if (isEmpty) {
      yPosition -= 12;
      return;
    }
    
    if (isTitle) {
      // Title - center dan bold
      const titleText = escapePdfText(trimmedLine);
      const titleX = (pageWidth - (trimmedLine.length * 8)) / 2;
      streamCommands.push(`BT /F2 14 Tf ${titleX} ${yPosition} Td (${titleText}) Tj ET`);
      yPosition -= 30;
      
    } else if (isHeader) {
      // Section headers - bold
      yPosition -= 5;
      streamCommands.push(`BT /F2 11 Tf ${leftMargin} ${yPosition} Td (${escapePdfText(trimmedLine)}) Tj ET`);
      yPosition -= 20;
      
    } else if (isSeparator) {
      // Skip separator lines untuk tampilan yang lebih bersih
      return;
      
    } else if (isFieldValue) {
      // Field-value pairs dengan format yang konsisten
      const parts = trimmedLine.split(' : ');
      const field = parts[0].trim();
      const value = parts.slice(1).join(' : ').trim();
      
      // Field name
      streamCommands.push(`BT /F2 10 Tf ${leftMargin} ${yPosition} Td (${escapePdfText(field)}) Tj ET`);
      // Separator
      streamCommands.push(`BT /F1 10 Tf ${leftMargin + 120} ${yPosition} Td (:) Tj ET`);
      // Value
      streamCommands.push(`BT /F1 10 Tf ${leftMargin + 130} ${yPosition} Td (${escapePdfText(value)}) Tj ET`);
      yPosition -= 16;
      
    } else if (isListItem) {
      // Numbered list
      streamCommands.push(`BT /F1 9 Tf ${leftMargin + 10} ${yPosition} Td (${escapePdfText(trimmedLine)}) Tj ET`);
      yPosition -= 14;
      
    } else if (isBulletPoint) {
      // Bullet points
      const bulletText = trimmedLine.substring(2).trim();
      streamCommands.push(`BT /F1 9 Tf ${leftMargin + 10} ${yPosition} Td (${escapePdfText('• ' + bulletText)}) Tj ET`);
      yPosition -= 14;
      
    } else if (isIndented) {
      // Indented text
      streamCommands.push(`BT /F1 9 Tf ${leftMargin + 20} ${yPosition} Td (${escapePdfText(trimmedLine.trim())}) Tj ET`);
      yPosition -= 14;
      
    } else {
      // Regular text
      streamCommands.push(`BT /F1 10 Tf ${leftMargin} ${yPosition} Td (${escapePdfText(trimmedLine)}) Tj ET`);
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

    // Header with professional formatting
    push('SURAT IZIN / KETERANGAN');
    push('');
    push('');

    // Document info in two columns style
    push(`Nomor Surat        : ${letter.letter_number}`);
    push(`Tanggal Pembuatan  : ${formatDateFull(letter.created_at)}`);
    push('');
    push('');

    // Information section with better structure
    push('Informasi Surat');
    push('_'.repeat(60));
    push('');
    push(`Jenis Surat        : ${letter.letter_type.toUpperCase()}`);
    push(`Kegiatan           : ${letter.activity}`);
    push(`Lokasi             : ${letter.location}`);
    push(`Tanggal Kegiatan   : ${formatDateFull(letter.date)}`);
    push(`Waktu              : ${letter.time_start} - ${letter.time_end} WIB`);

    if (letter.reason) {
      push('');
      push('Keterangan:');
      wrapText(letter.reason, 65).forEach(line => push(`  ${line}`));
    }

    push('');
    push('');

    // Participants section with better formatting
    push('Daftar Peserta:');
    push('_'.repeat(60));
    push('');
    if (!letter.participants.length) {
      push('  (Tidak ada peserta terdaftar)');
    } else {
      letter.participants.forEach((p, i) => {
        const no = String(i + 1).padStart(2, '0');
        const name = p.name.padEnd(30);
        push(`  ${no}. ${name} - ${p.class}`);
      });
    }

    push('');
    push('');

    // Digital signature section with professional layout
    push('Tanda Tangan Elektronik Sistem');
    push('_'.repeat(60));
    push('');
    push(`Status             : DISETUJUI`);
    push(`Kode Validasi      : ${validationCode}`);    
    push(`Tanggal Persetujuan: ${letter.approved_at ? formatDateFull(letter.approved_at) : formatDateFull(letter.created_at)}`);
    push('');
    push('');

    // Footer information with better structure
    push('INFORMASI VALIDASI:');
    push('_'.repeat(60));
    push('');
    push('> Kode validasi dihasilkan otomatis menggunakan HMAC-SHA256');
    push('> Perubahan isi dokumen akan membuat kode tidak valid');
    push('> Untuk verifikasi, cocokkan kode dengan sistem');
    push('> Masukkan 16 karakter kode validasi untuk verifikasi');
    push('');
    push('');
    push(`Dokumen digenerate otomatis: ${new Date().toLocaleString('id-ID')}`);

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