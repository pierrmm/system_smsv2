'use client';

import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { DatePicker } from '@heroui/date-picker';
import { TimeInput } from '@heroui/date-input';
import {
  IconPlus,
  IconTrash,
  IconDeviceFloppy,
  IconArrowLeft
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';
import Loading from '@/components/Loading';
import { parseDate, parseTime } from '@internationalized/date';

interface Participant {
  name: string;
  class: string;
  reason: string; // Tambahkan field keterangan per peserta
}

interface FormData {
  date_start: string;
  date_end: string;
  time_start: string;
  time_end: string;
  location: string;
  activity: string;
  letter_type: string;
  participants: Participant[];
}

export default function CreatePermissionLetterPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    date_start: '',
    date_end: '',
    time_start: '',
    time_end: '',
    location: '',
    activity: '',
    letter_type: '',
    participants: [{ name: '', class: '', reason: '' }]
  });

  const letterTypes = [
    { key: 'dispensasi', label: 'Surat Dispensasi' },
    { key: 'keterangan', label: 'Surat Keterangan' },
    { key: 'surat_tugas', label: 'Surat Tugas' },
    { key: 'lomba', label: 'Surat Izin Lomba' }
  ];

  const todayIso = new Date().toISOString().slice(0,10);

  const handleBack = () => router.back();

  // Require login: redirect to login with return path
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent('/letters/permissions/create')}`);
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <AppLayout>
        <Loading message="Memuat..." size="lg" className="min-h-96" />
      </AppLayout>
    );
  }

  const addParticipant = () =>
    setFormData(f => ({ ...f, participants: [...f.participants, { name: '', class: '', reason: '' }] }));

  const removeParticipant = (index: number) => {
    setFormData(f => ({
      ...f,
      participants: f.participants.length > 1
        ? f.participants.filter((_, i) => i !== index)
        : f.participants
    }));
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    setFormData(f => {
      const copy = [...f.participants];
      copy[index][field] = value;
      return { ...f, participants: copy };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi detail
    const missing: string[] = [];
    if (!formData.activity) missing.push('Kegiatan');
    if (!formData.location) missing.push('Lokasi');
    if (!formData.letter_type) missing.push('Jenis Surat');
    if (!formData.date_start) missing.push('Tanggal Mulai');
    if (!formData.date_end) missing.push('Tanggal Selesai');
    if (!formData.time_start) missing.push('Waktu Mulai');
    if (!formData.time_end) missing.push('Waktu Selesai');

    // Validasi peserta
    const participantIssues = formData.participants
      .map((p, i) => (!p.name || !p.class ? `Peserta #${i + 1}` : null))
      .filter(Boolean);

    // Validasi konsistensi tanggal
    if (formData.date_start && formData.date_end && formData.date_start > formData.date_end) {
      alert('Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai.');
      return;
    }

    if (missing.length) {
      alert(`Lengkapi field wajib: ${missing.join(', ')}`);
      return;
    }
    if (participantIssues.length) {
      alert(`Lengkapi data peserta: ${participantIssues.join(', ')}`);
      return;
    }

    // Payload kompatibel dengan backend lama (field "date" tunggal)
    const payload = {
      ...formData,
      date: formData.date_start,       // kompatibilitas
      date_end: formData.date_end,     // jika backend nanti mendukung rentang
      participants: formData.participants.map(p => ({
        name: p.name,
        class: p.class,
        reason: p.reason
      })),
      created_by: user?.id || 'system'
    };

    setLoading(true);
    let attempt = 0;
    const MAX_RETRY = 2;

    while (attempt < MAX_RETRY) {
      try {
        console.log('Submitting permission letter payload:', payload);
        const response = await fetch('/api/permission-letters', {
          method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
          router.push('/letters/permissions');
          return;
        } else {
          const error = await response.json().catch(() => ({}));
          if (error?.error?.toLowerCase?.().includes('nomor unik') && attempt < MAX_RETRY - 1) {
            attempt++;
            continue;
          }
          alert(error.error || 'Gagal menyimpan surat');
          break;
        }
      } catch (err) {
        console.error(err);
        if (attempt < MAX_RETRY - 1) {
          attempt++;
          continue;
        }
        alert('Terjadi kesalahan saat menyimpan surat');
        break;
      } finally {
        attempt++;
      }
    }
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="light"
            isIconOnly
            onPress={handleBack}
            className="text-gray-600 dark:text-gray-400"
          >
            <IconArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Buat Pengajuan Surat
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Buat Pengajuan Surat baru untuk siswa atau kegiatan sekolah
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informasi Surat */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Informasi Surat</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date Range */}
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tanggal Mulai
                    </span>
                    <DatePicker
                      aria-label="Tanggal Mulai"
                      variant="flat"
                      value={formData.date_start ? parseDate(formData.date_start) : null}
                      minValue={parseDate(todayIso)}
                      onChange={(val) =>
                        setFormData(f => ({ ...f, date_start: val ? val.toString() : '' }))
                      }
                      isRequired
                      placeholderValue={parseDate(
                        new Date().toISOString().slice(0, 10)
                      )}
                      className="w-full"
                      granularity="day"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tanggal Selesai
                    </span>
                    <DatePicker
                      aria-label="Tanggal Selesai"
                      variant="flat"
                      value={formData.date_end ? parseDate(formData.date_end) : null}
                      minValue={parseDate(todayIso)}
                      onChange={(val) =>
                        setFormData(f => ({ ...f, date_end: val ? val.toString() : '' }))
                      }
                      isRequired
                      placeholderValue={parseDate(
                        new Date().toISOString().slice(0, 10)
                      )}
                      className="w-full"
                      granularity="day"
                    />
                  </div>
                </div>

                {/* Jenis Surat (dikembalikan) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jenis Surat
                  </label>
                  <Select
                    placeholder="Pilih jenis surat"
                    selectedKeys={formData.letter_type ? [formData.letter_type] : []}
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;
                      setFormData(f => ({ ...f, letter_type: selectedKey }));
                    }}
                  >
                    {letterTypes.map(type => (
                      <SelectItem key={type.key}>{type.label}</SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Time Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TimeInput
                    label="Waktu Mulai"
                    variant="flat"
                    value={formData.time_start ? parseTime(formData.time_start) : null}
                    onChange={(val) =>
                      setFormData(f => ({ ...f, time_start: val ? val.toString().slice(0,5) : '' }))
                    }
                    hourCycle={24}
                    isRequired
                  />
                  <TimeInput
                    label="Waktu Selesai"
                    variant="flat"
                    value={formData.time_end ? parseTime(formData.time_end) : null}
                    onChange={(val) =>
                      setFormData(f => ({ ...f, time_end: val ? val.toString().slice(0,5) : '' }))
                    }
                    hourCycle={24}
                    isRequired
                  />
                </div>

                <Input
                  label="Lokasi/Tempat"
                  placeholder="Masukkan lokasi kegiatan"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />

                <Input
                  label="Kegiatan"
                  placeholder="Masukkan nama kegiatan"
                  value={formData.activity}
                  onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                  required
                />

                {/* Hapus textarea alasan/keterangan global */}
              </CardBody>
            </Card>

          {/* Daftar Peserta */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <h3 className="text-lg font-semibold">Daftar Peserta</h3>
                <Button
                  type="button"
                  color="primary"
                  variant="flat"
                  size="sm"
                  startContent={<IconPlus className="h-4 w-4" />}
                  onPress={addParticipant}
                >
                  Tambah Peserta
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {formData.participants.map((participant, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-4">
                  <Input
                    label="Nama"
                    placeholder="Masukkan nama"
                    value={participant.name}
                    onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Input
                    label="Jabatan"
                    placeholder="Contoh: Kelas/Guru"
                    value={participant.class}
                    onChange={(e) => updateParticipant(index, 'class', e.target.value)}
                    className="flex-1"
                    required
                  />
                  {/* Field keterangan per peserta */}
                  <Input
                    label="Keterangan"
                    placeholder="Keterangan/alasan"
                    value={participant.reason}
                    onChange={(e) => updateParticipant(index, 'reason', e.target.value)}
                    className="flex-1"
                  />
                  {formData.participants.length > 1 && (
                    <div className="flex items-end">
                      <Button
                        type="button"
                        color="danger"
                        variant="light"
                        isIconOnly
                        onPress={() => removeParticipant(index)}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="light"
              onPress={handleBack}
              disabled={loading}
            >
              Kembali
            </Button>
            <Button
              type="submit"
              color="primary"
              startContent={<IconDeviceFloppy className="h-4 w-4" />}
              isLoading={loading}
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan Surat'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
