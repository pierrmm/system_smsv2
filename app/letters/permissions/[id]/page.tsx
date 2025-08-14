'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Button } from '@heroui/button';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import { 
  IconArrowLeft,
  IconPrinter,
  IconCheck,
  IconX,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconUsers,
  IconCopy,
  IconDownload // tambah
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import Link from 'next/link';

interface PermissionLetter {
  id: string;
  letter_number: string;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  activity: string;
  letter_type: string;
  reason: string;
  status: string;
  created_at: string;
  approved_at: string;
  participants: Array<{
    id: string;
    name: string;
    class: string;
  }>;
}

export default function PermissionLetterDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [letter, setLetter] = useState<PermissionLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [letterId, setLetterId] = useState<string>('');

  // Resolve params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setLetterId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  const fetchLetter = async () => {
    if (!letterId) return;
    
    try {
      const response = await fetch(`/api/permission-letters/${letterId}`);
      if (response.ok) {
        const data = await response.json();
        setLetter(data);
      } else {
        router.push('/letters/permissions');
      }
    } catch (error) {
      console.error('Error fetching letter:', error);
      router.push('/letters/permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (letterId) {
      fetchLetter();
    }
  }, [letterId]);

  const handleApproval = async (status: 'approved' | 'rejected') => {
    if (!letter || !user) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/permission-letters/${letter.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          approved_by: user.id,
        }),
      });

      if (response.ok) {
        const updatedLetter = await response.json();
        setLetter(updatedLetter);
      } else {
        alert('Gagal mengubah status surat');
      }
    } catch (error) {
      console.error('Error updating letter status:', error);
      alert('Terjadi kesalahan sistem');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      default: return 'warning';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      default: return 'Menunggu Persetujuan';
    }
  };

  const getLetterTypeText = (type: string) => {
    switch (type) {
      case 'dispensasi': return 'Surat Dispensasi';
      case 'keterangan': return 'Surat Keterangan';
      case 'surat_tugas': return 'Surat Tugas';
      case 'lomba': return 'Surat Izin Lomba';
      default: return type;
    }
  };

  const duplicateToDraft = async () => {
    if (!letter || !user) return;
    try {
      const res = await fetch('/api/permission-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity: letter.activity,
          location: letter.location,
          date: letter.date,
          time_start: letter.time_start,
          time_end: letter.time_end,
          letter_type: letter.letter_type,
          reason: letter.reason,
          participants: letter.participants?.map(p => ({ name: p.name, class: p.class })),
          status: 'draft'
        })
      });
      if (res.ok) {
        const created = await res.json();
        router.push(`/letters/permissions/${created.id}/edit`);
      } else {
        alert('Gagal menyalin ke draft');
      }
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat membuat draft');
    }
  };

  const downloadPdf = async () => {
    if (!letter || letter.status !== 'approved') return;
    try {
      setPdfLoading(true);
      const res = await fetch(`/api/permission-letters/${letter.id}/pdf`);
      if (!res.ok) {
        alert('Gagal membuat PDF');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Surat-${letter.letter_number.replace(/\//g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat mengunduh PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading || !letterId) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Memuat data surat...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!letter) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Surat tidak ditemukan</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
             <Link href="/letters/permissions">
               <Button
                variant="light"
                size="sm"
                className="md:size-medium"
                startContent={<IconArrowLeft className="h-4 w-4" />}
               >
                 Kembali
               </Button>
             </Link>
             <div>
               <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                 Detail Surat Izin
               </h1>
               <p className="text-gray-600 dark:text-gray-400 mt-1">
                 {letter.letter_number}
               </p>
             </div>
           </div>
           
          <div className="flex gap-2 flex-wrap">
            {letter.status === 'approved' && (
              <Button
                variant="flat"
                color="default"
                startContent={<IconDownload className="h-4 w-4" />}
                onClick={downloadPdf}
                isLoading={pdfLoading}
              >
                Download PDF
              </Button>
            )}
            {user?.role === 'admin' && letter.status === 'pending' && (
               <>
                 <Button
                   color="success"
                   variant="flat"
                   size="sm"
                   className="w-full sm:w-auto md:size-medium"
                   startContent={<IconCheck className="h-4 w-4" />}
                   onClick={() => handleApproval('approved')}
                   isLoading={actionLoading}
                 >
                   Setujui
                 </Button>
                 <Button
                   color="danger"
                   variant="flat"
                   size="sm"
                   className="w-full sm:w-auto md:size-medium"
                   startContent={<IconX className="h-4 w-4" />}
                   onClick={() => handleApproval('rejected')}
                   isLoading={actionLoading}
                 >
                   Tolak
                 </Button>
               </>
             )}
           </div>
         </div>

        {/* Status Card */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Status Surat
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Dibuat pada {new Date(letter.created_at).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <Chip
                                color={getStatusColor(letter.status)}
                variant="flat"
                size="lg"
              >
                {getStatusText(letter.status)}
              </Chip>
            </div>
          </CardBody>
        </Card>

        {/* Letter Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informasi Surat */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Informasi Surat</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Jenis Surat
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {getLetterTypeText(letter.letter_type)}
                </p>
              </div>

              <Divider />

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Kegiatan
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {letter.activity}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <IconCalendar className="h-4 w-4 text-gray-400" />
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tanggal
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(letter.date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <IconClock className="h-4 w-4 text-gray-400" />
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Waktu
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {letter.time_start} - {letter.time_end} WIB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <IconMapPin className="h-4 w-4 text-gray-400" />
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Lokasi
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {letter.location}
                  </p>
                </div>
              </div>

              {letter.reason && (
                <>
                  <Divider />
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Alasan/Keterangan
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {letter.reason}
                    </p>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Daftar Peserta */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <IconUsers className="h-5 w-5" />
                <h3 className="text-lg font-semibold">
                  Daftar Peserta ({letter.participants.length} orang)
                </h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {letter.participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {participant.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Kelas {participant.class}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    #{index + 1}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        {/* Approval Information */}
        {letter.approved_at && (
          <Card>
            <CardBody className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Informasi Persetujuan
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Surat ini telah {letter.status === 'approved' ? 'disetujui' : 'ditolak'} pada{' '}
                  {new Date(letter.approved_at).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}