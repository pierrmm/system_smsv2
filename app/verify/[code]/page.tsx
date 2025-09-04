'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Button } from '@heroui/button';
import Loading from '@/components/Loading';
import { IconShieldCheck, IconShieldX, IconFileText, IconCalendar, IconMapPin } from '@tabler/icons-react';
import Link from 'next/link';

interface VerificationResult {
  valid: boolean;
  letter?: {
    id: string;
    letter_number: string;
    letter_type: string;
    activity: string;
    location: string;
    date: string;
    status: string;
    created_at: string;
    approved_at?: string;
  };
  error?: string;
}

export default function VerifyPage() {
  const params = useParams();
  const code = params.code as string;
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to parse `<LETTER_NUMBER>-<HMAC16>` and safely decode the number
  const parseCode = (rawCode: string) => {
    const raw = String(rawCode || '');
    const lastDash = raw.lastIndexOf('-');
    const encodedNumber = lastDash > 0 ? raw.slice(0, lastDash) : '';
    const validationOnly = lastDash > 0 ? raw.slice(lastDash + 1) : raw;
    let numberDecoded = encodedNumber;
    try { numberDecoded = decodeURIComponent(encodedNumber); } catch {}
    return { letterNumber: numberDecoded, validationCode: validationOnly };
  };

  useEffect(() => {
    const verifyCode = async () => {
      try {
        // Backend endpoint yang benar adalah /api/verify-document (POST)
        const { letterNumber, validationCode } = parseCode(code);

        const response = await fetch('/api/verify-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            letterNumber,
            validationCode
          })
        });
        const data = await response.json();
        if (data.letterInfo) {
          setResult({
            valid: data.valid,
            letter: {
              id: data.letterInfo.id || 'unknown',
              letter_number: data.letterInfo.letterNumber,
              letter_type: data.letterInfo.letterType,
              activity: data.letterInfo.activity,
              location: data.letterInfo.location,
              date: data.letterInfo.date,
              status: data.letterInfo.status,
              created_at: data.letterInfo.createdAt,
              approved_at: data.letterInfo.approvedAt,
            },
            error: data.message
          });
        } else {
          setResult({ valid: data.valid, error: data.message });
        }
      } catch (error) {
        setResult({
          valid: false,
          error: 'Gagal memverifikasi kode'
        });
      } finally {
        setLoading(false);
      }
    };

    if (code) verifyCode();
  }, [code]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLetterTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'dispensasi': 'Dispensasi',
      'keterangan': 'Keterangan',
      'surat_tugas': 'Surat Tugas',
      'lomba': 'Izin Lomba'
    };
    return types[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'pending': return 'Menunggu';
      case 'rejected': return 'Ditolak';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading message="Memverifikasi dokumen..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="shadow-lg border border-gray-200 dark:border-gray-800">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="flex flex-col items-center gap-4">
              {result?.valid ? (
                <IconShieldCheck className="h-16 w-16 text-green-500" />
              ) : (
                <IconShieldX className="h-16 w-16 text-red-500" />
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  {result?.valid ? 'Dokumen Valid' : 'Dokumen Tidak Valid'}
                </h1>
                {/* Tampilkan nomor surat dan kode secara terpisah agar jelas */}
                <div className="mt-3 space-y-1 text-gray-600 dark:text-gray-400">
                  <p>
                    Nomor Surat: <span className="font-mono font-bold">{parseCode(code).letterNumber || '-'}</span>
                  </p>
                  <p>
                    Kode: <span className="font-mono font-bold">{parseCode(code).validationCode}</span>
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-6 sm:px-8 pb-8">
            {result?.valid && result?.letter ? (
              <div className="space-y-6">
                {/* Summary chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <Chip size="sm" variant="flat" color="primary">{getLetterTypeLabel(result.letter.letter_type)}</Chip>
                  <Chip size="sm" variant="flat" color={getStatusColor(result.letter.status)}>{getStatusLabel(result.letter.status)}</Chip>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <IconFileText className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">Nomor Surat:</span>
                    <span>{result.letter.letter_number}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <IconFileText className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">Jenis Surat:</span>
                    <span>{getLetterTypeLabel(result.letter.letter_type)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <IconCalendar className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">Tanggal:</span>
                    <span>{formatDate(result.letter.date)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <IconMapPin className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">Lokasi:</span>
                    <span>{result.letter.location}</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">Aktivitas</h2>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {result.letter.activity}
                      </p>
                    </div>
                    <Chip 
                      color={getStatusColor(result.letter.status)}
                      variant="flat"
                    >
                      {getStatusLabel(result.letter.status)}
                    </Chip>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium mb-2">Informasi Tambahan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Dibuat pada:</span>
                      <p className="font-medium">{formatDate(result.letter.created_at)}</p>
                    </div>
                    {result.letter.approved_at && (
                      <div>
                        <span className="text-sm text-gray-500">Disetujui pada:</span>
                        <p className="font-medium">{formatDate(result.letter.approved_at)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.letter.id !== 'unknown' && (
                    <Button 
                      as={Link} 
                      href={`/letters/permissions/${result.letter.id}?from=verify&code=${encodeURIComponent(code)}`}
                      variant="solid"
                      color="primary"
                    >
                      Lihat Detail Surat
                    </Button>
                  )}
                  <Button 
                    as={Link} 
                    href="/"
                    variant="bordered"
                    color="default"
                  >
                    Kembali ke Beranda
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <IconShieldX className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Dokumen Tidak Valid</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {result?.error || 'Kode verifikasi tidak ditemukan atau tidak valid.'}
                </p>
                <Button 
                  as={Link} 
                  href="/"
                  variant="solid"
                  color="primary"
                >
                  Kembali ke Beranda
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
