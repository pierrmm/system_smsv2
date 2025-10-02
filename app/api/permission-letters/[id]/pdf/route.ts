// app/api/letters/[id]/pdf/route.ts
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/** ---------- Browser Pool (reuse 1 instance) ---------- */
class BrowserPool {
  private static instance: BrowserPool;
  private browser: puppeteer.Browser | null = null;
  private isCreating = false;
  private lastUsed = Date.now();
  private readonly BROWSER_TIMEOUT = 5 * 60 * 1000;

  static getInstance() {
    if (!BrowserPool.instance) BrowserPool.instance = new BrowserPool();
    return BrowserPool.instance;
  }

  async getBrowser(): Promise<puppeteer.Browser> {
    if (this.browser && this.browser.isConnected()) {
      this.lastUsed = Date.now();
      return this.browser;
    }
    if (this.browser) {
      try { await this.browser.close(); } catch {}
      this.browser = null;
    }
    if (this.isCreating) {
      await new Promise(r => setTimeout(r, 800));
      return this.getBrowser();
    }
    this.isCreating = true;
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--no-zygote',
          '--disable-gpu',
        ],
        timeout: 30000,
        protocolTimeout: 30000,
      });
      this.lastUsed = Date.now();
      return this.browser!;
    } finally {
      this.isCreating = false;
    }
  }

  async cleanup() {
    if (this.browser) {
      try { await this.browser.close(); } catch {}
      this.browser = null;
    }
  }

  startCleanupTimer() {
    setInterval(async () => {
      if (this.browser && Date.now() - this.lastUsed > this.BROWSER_TIMEOUT) {
        await this.cleanup();
      }
    }, 60000);
  }
}
const browserPool = BrowserPool.getInstance();
browserPool.startCleanupTimer();

/** ---------- Utils ---------- */
function hmacSignature(letterId: string, approvedAt: Date) {
  const secret = process.env.HMAC_SECRET || 'default-secret-key';
  const data = `${letterId}-${approvedAt.toISOString()}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 16);
}

async function generateQRCode(data: string) {
  try {
    return await QRCode.toDataURL(data, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  } catch {
    return '';
  }
}

function getLogoBase64(imagePath: string) {
  try {
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    if (!fs.existsSync(fullPath)) return '';
    const buf = fs.readFileSync(fullPath);
    const mime = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch { return ''; }
}

function formatDateIndonesia(date: Date): string {
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/** ---------- HTML Generator (no "Lanjutan") ---------- */
function generateHTML(letter: any, validationCode: string, qrCodeDataUrl: string) {
  const META_PREFIX = '__META__:';
  let meta: any = {};
  if (typeof letter.reason === 'string' && letter.reason.includes(META_PREFIX)) {
    const line = letter.reason.split('\n').find((l: string) => l.startsWith(META_PREFIX));
    try { if (line) meta = JSON.parse(line.slice(META_PREFIX.length)); } catch {}
  }

  const startDateObj = new Date(letter.date_start || letter.date);
  const endDateObj = new Date(letter.date_end || letter.date_start || letter.date);
  const sameMonthYear = startDateObj.getMonth() === endDateObj.getMonth() && startDateObj.getFullYear() === endDateObj.getFullYear();
  const durationDays = Math.abs(Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))) + 1;

  const letterTypeMap: Record<string, string> = {
    dispensasi: 'DISPENSASI',
    keterangan: 'KETERANGAN',
    surat_tugas: 'TUGAS',
    lomba: 'IZIN LOMBA',
  };
  const letterTypeTitle = letterTypeMap[letter.letter_type] || (letter.letter_type || '').toUpperCase();

  const yayasanLogo = getLogoBase64('images/yayasan.png');
  const pesatLogo = getLogoBase64('images/pesat1.png');

  const participantsAugmented = (letter.participants || []).map((p: any) => {
    if (p.reason) return p;
    const found = Array.isArray(meta.participants) ? meta.participants.find((m: any) => m.name === p.name) : null;
    return found?.reason ? { ...p, reason: found.reason } : p;
  });

  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const formatRange = () => {
    if (startDateObj.getTime() === endDateObj.getTime()) return `${formatDateIndonesia(startDateObj)} (1 hari)`;
    if (sameMonthYear) return `${startDateObj.getDate()} s.d ${endDateObj.getDate()} ${months[endDateObj.getMonth()]} ${endDateObj.getFullYear()} (${durationDays} hari)`;
    return `${formatDateIndonesia(startDateObj)} s.d ${formatDateIndonesia(endDateObj)} (${durationDays} hari)`;
  };

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Surat ${letterTypeTitle}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--logo-size:140px;--page-pad-top:14mm;--page-pad-h:14mm;--header-gap:8px}
  body{font-family:'Times New Roman',serif;font-size:12px;line-height:1.45;color:#000;background:#fff}
  .page{width:210mm;min-height:297mm;padding:var(--page-pad-top) var(--page-pad-h) 16mm;margin:0 auto;position:relative}
  .page-break{page-break-before:always}

  /* ===== HEADER (sesuai contoh) ===== */
  .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;border-bottom:3px solid #000;padding-bottom:8px;position:relative}
  .logo-left,.logo-right{width:var(--logo-size);height:var(--logo-size);display:flex;align-items:center;justify-content:center}
  .logo-left img,.logo-right img{max-width:var(--logo-size);max-height:var(--logo-size);object-fit:contain}
  .header-center{flex:1;text-align:center;margin:0 var(--header-gap)}
  .header-center h1{font-size:18px;font-weight:bold;text-transform:uppercase;margin-bottom:2px}
  .header-center h2{font-size:28px;font-weight:900;text-transform:uppercase;margin-bottom:2px}
  .header-center h3{font-size:16px;font-weight:bold;text-transform:uppercase;margin-bottom:8px}
  .header-center p.addr{font-size:12px;margin-bottom:2px}
  .header-center p.contact{font-size:12px;font-weight:600;margin-bottom:0}
  .npsn{position:absolute;right:0;bottom:1px;font-size:13px;font-weight:800}

  .document-title{text-align:center;margin:14px 0 12px}
  .document-title h3{font-size:18px;font-weight:bold;text-decoration:underline;margin-bottom:6px}
  .document-number{font-size:14px;font-weight:600}

  .content{margin-bottom:18px;text-align:justify;line-height:1.6;font-size:13px}
  .content p{margin-bottom:10px}

  /* ===== TABLE (auto paginate, no "Lanjutan") ===== */
  table{border-collapse:collapse;width:100%}
  .participants-table{margin:10px 0;border:1px solid #000;font-size:13px}
  .participants-table th,.participants-table td{border:1px solid #000;padding:6px 8px;vertical-align:top}
  .participants-table th{background:#f5f5f5;font-weight:bold;text-align:center;font-size:13px}
  .participants-table .no-col{width:30px;text-align:center}
  .participants-table .name-col{width:40%}
  .participants-table .class-col{width:30%}
  .participants-table .reason-col{width:30%}
  thead{display:table-header-group}
  tfoot{display:table-footer-group}
  tr{page-break-inside:avoid}

  .info-table{margin:8px 0 4px;border:none;width:100%;font-size:13px}
  .info-table td{border:none;padding:2px 0}
  .info-table .label{width:80px}.info-table .colon{width:20px}

  .closing-text{margin-top:12px;text-align:justify}

  /* ===== SIGNATURE AREA (kiri ack-box, kanan QR) ===== */
  .signature-section{
    margin-top:24px;
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:24px;
    font-size:13px
  }
  .ack-box{
    flex:1;
    font-size:13px;
    line-height:1.7;
  }
  .ack-title{font-weight:600;margin-bottom:2px}
  .dots{letter-spacing:1px}
  .ack-signline{
    margin-top:30px;
    width:280px;
    border-bottom:1px dotted #000;
    height:1px;
  }

  .sign-box{
    width:240px;
    text-align:center;
  }
  .signature-date{margin-bottom:6px;font-size:13px}
  .signature-title{margin-bottom:6px}
  .qr-block{margin:8px auto 6px;display:flex;flex-direction:column;align-items:center;gap:4px}
  .qr-code{width:90px;height:90px}
  .validation-code{font-family:monospace;font-weight:bold;font-size:10px}
  .validation-text{color:#666;font-size:8px}
  .signature-name{font-weight:bold;text-decoration:underline;margin-top:28px;font-size:14px}
  .signature-nip{margin-top:3px;font-size:12px}

  /* ===== NOTES ===== */
  .notes{margin-top:20px;font-size:11px}
  .notes-title{font-weight:bold;margin-bottom:6px}
  .notes ol{margin:0 0 0 18px;padding:0}
  .notes li{margin:2px 0}

  @media print{.page{margin:0;box-shadow:none}}
</style>
</head>
<body>
  <div class="page">
    <!-- HEADER -->
    <div class="header">
      <div class="logo-left">${yayasanLogo ? `<img src="${yayasanLogo}" alt="Logo Yayasan">` : ''}</div>
      <div class="header-center">
        <h1>YAYASAN PESAT BIRRUL WALIDAIN</h1>
        <h2>SMK INFORMATIKA PESAT</h2>
        <h3>TERAKREDITASI A</h3>
        <p class="addr">Jalan Poras No. 7 Sindang Barang Loji ☎ (0251) 8346223 Kota Bogor</p>
        <p class="contact">Email : smkit.pesat@gmail.com&nbsp;&nbsp; Website: www.smkpesat.sch.id</p>
      </div>
      <div class="logo-right">${pesatLogo ? `<img src="${pesatLogo}" alt="Logo SMK PESAT">` : ''}</div>
      <div class="npsn">NPSN : 20267664</div>
    </div>

    <!-- TITLE -->
    <div class="document-title">
      <h3>SURAT ${letterTypeTitle}</h3>
      <div class="document-number">Nomor: ${letter.letter_number}</div>
    </div>

    <!-- CONTENT -->
    <div class="content">
      <p>Yang bertanda tangan di bawah ini, Kepala SMK PESAT IT XPRO menerangkan bahwa:</p>

      <table class="participants-table">
        <thead>
          <tr>
            <th class="no-col">No</th>
            <th class="name-col">Nama Siswa</th>
            <th class="class-col">Kelas/Jabatan</th>
            <th class="reason-col">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${(participantsAugmented).map((p:any,i:number)=>`
            <tr>
              <td class="no-col">${i+1}</td>
              <td>${p.name}</td>
              <td>${p.class}</td>
              <td>${p.reason || '-'}</td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="text-align:center;font-weight:bold;padding:6px 0;">
              Total Peserta: ${participantsAugmented.length}
            </td>
          </tr>
        </tfoot>
      </table>

      <table class="info-table">
        <tr><td class="label">Kegiatan</td><td class="colon">:</td><td>${letter.activity}</td></tr>
        <tr><td class="label">Tanggal</td><td class="colon">:</td><td>${formatRange()}</td></tr>
        <tr><td class="label">Tempat</td><td class="colon">:</td><td>${letter.location}</td></tr>
        <tr><td class="label">Waktu</td><td class="colon">:</td><td>${letter.time || 'Sesuai jadwal'}</td></tr>
      </table>

      <div class="closing-text">
        <p>Demikian surat ${letterTypeTitle.toLowerCase()} ini dibuat untuk dapat dipergunakan sebagaimana mestinya.</p>
      </div>
    </div>

    <!-- SIGNATURE: left ack-box, right QR -->
    <div class="signature-section">
      <div class="ack-box">
       
      </div>

      <div class="sign-box">
        <div class="signature-date">Bogor, ${formatDateIndonesia(new Date())}</div>
        <div class="qr-block">
          ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code">` : ''}
          <div class="validation-code">${validationCode}</div>
          <div class="validation-text">Kode Validasi Dokumen</div>
        </div>
    
      </div>
    </div>


  </div>
</body>
</html>`;
}

/** ---------- Route ---------- */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const letter = await prisma.permissionLetter.findUnique({
      where: { id },
      include: { participants: true, creator: true, approver: true },
    });

    if (!letter) return new Response('Letter not found', { status: 404 });
    if (letter.status !== 'approved')
      return new Response('Letter not approved yet', { status: 400 });

    const validationCode = hmacSignature(letter.id, letter.approved_at!);
    // Sertakan nomor surat di path, encoded agar tidak memecah segmen (slash -> %2F)
    const safeNumber = encodeURIComponent(letter.letter_number || '');
    const validationUrl = `${request.nextUrl.origin}/verify/${safeNumber}-${validationCode}`;
    const qrCodeDataUrl = await generateQRCode(validationUrl);

    const html = generateHTML(letter, validationCode, qrCodeDataUrl);

    const browser = await browserPool.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        preferCSSPageSize: true,
      });
      await page.close();

      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="surat-${letter.letter_number}.pdf"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    } catch {
      try { await page.close(); } catch {}
      return new Response('Error generating PDF', { status: 500 });
    }
  } catch {
    return new Response('Internal server error', { status: 500 });
  }
}

/** ---------- Cleanup ---------- */
process.on('SIGINT', async () => { await browserPool.cleanup(); process.exit(0); });
process.on('SIGTERM', async () => { await browserPool.cleanup(); process.exit(0); });
