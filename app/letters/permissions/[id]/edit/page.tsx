'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  IconPlus,
  IconTrash,
  IconDeviceFloppy,
  IconArrowLeft
} from '@tabler/icons-react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { Spinner } from '@heroui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { DatePicker } from '@heroui/date-picker';
import { TimeInput } from '@heroui/date-input';
import { parseDate, CalendarDate, parseTime, Time } from '@internationalized/date';

function safeParseDate(value: string | null | undefined): CalendarDate | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  try { return parseDate(value); } catch { return undefined; }
}

function safeParseTime(value: string | null | undefined): Time | undefined {
  if (!value) return undefined;
  if (!/^\d{2}:\d{2}$/.test(value)) return undefined;
  try { return parseTime(value); } catch { return undefined; }
}

interface Participant {
  id?: string;
  name: string;
  class: string;
}

interface PermissionLetter {
  id: string;
  letter_number: string;
  activity: string;
  location: string;
  date: string;
  time_start: string;
  time_end: string;
  letter_type: string;
  reason?: string;
  status: string;
  created_by: string;
  participants: Participant[];
}

export default function EditPermissionLetterPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [letter, setLetter] = useState<PermissionLetter | null>(null);

  const [formData, setFormData] = useState({
    activity: '',
    location: '',
    date: '',
    time_start: '',
    time_end: '',
    letter_type: 'dispensasi',
    reason: ''
  });

  const [participants, setParticipants] = useState<Participant[]>([
    { name: '', class: '' }
  ]);

  const letterTypes = [
    { key: 'dispensasi', label: 'Surat Dispensasi' },
    { key: 'keterangan', label: 'Surat Keterangan' },
    { key: 'surat_tugas', label: 'Surat Tugas' },
    { key: 'lomba', label: 'Surat Izin Lomba' }
  ];

  const handleAddParticipant = () =>
    setParticipants(p => [...p, { name: '', class: '' }]);

  const handleRemoveParticipant = (index: number) => {
    setParticipants(p => p.length > 1 ? p.filter((_, i) => i !== index) : p);
  };

  const handleParticipantChange = (index: number, field: keyof Participant, value: string) => {
    setParticipants(p => p.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.activity || !formData.location || !formData.date ||
        !formData.time_start || !formData.time_end) {
      alert('Mohon lengkapi field wajib.');
      return;
    }
    const validParticipants = participants.filter(p => p.name.trim() && p.class.trim());
    if (validParticipants.length === 0) {
      alert('Minimal satu peserta.');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`/api/permission-letters/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, participants: validParticipants })
      });
      if (res.ok) router.push(`/letters/permissions/${params.id}`);
      else {
        const err = await res.json();
        alert(err.message || 'Gagal mengupdate surat');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchLetter = async () => {
      try {
        const res = await fetch(`/api/permission-letters/${params.id}`);
        if (!res.ok) { router.push('/letters/permissions'); return; }
        const data: PermissionLetter = await res.json();
        setLetter(data);
        if (!isAdmin() && data.created_by !== user?.id) {
          router.push('/letters/permissions');
          return;
        }
        setFormData({
          activity: data.activity,
            location: data.location,
            date: data.date,
            time_start: data.time_start,
            time_end: data.time_end,
            letter_type: data.letter_type,
            reason: data.reason || ''
        });
        setParticipants(data.participants.length ? data.participants : [{ name: '', class: '' }]);
      } catch (e) {
        console.error(e);
        router.push('/letters/permissions');
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchLetter();
  }, [params.id, user, isAdmin, router]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-96">
          <div className="text-center">
            <Spinner size="lg" color="primary" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Memuat data...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!letter) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Surat tidak ditemukan</h2>
          <Button color="primary" onPress={() => router.push('/letters/permissions')}>
            Kembali
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header sama gaya create */}
        <div className="flex items-center gap-4">
          <Button
            variant="light"
            isIconOnly
            onPress={() => router.back()}
            className="text-gray-600 dark:text-gray-400"
          >
            <IconArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Surat Izin
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Nomor: {letter.letter_number}
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
                {/* Tanggal */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tanggal Kegiatan
                  </span>
                  <DatePicker
                    aria-label="Tanggal Kegiatan"
                    variant="flat"
                    value={safeParseDate(formData.date) || null}
                    onChange={(val) =>
                      setFormData(f => ({ ...f, date: val ? val.toString() : '' }))
                    }
                    placeholderValue={parseDate(new Date().toISOString().slice(0,10))}
                    isRequired
                    granularity="day"
                  />
                </div>

                {/* Jenis Surat */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jenis Surat
                  </label>
                  <Select
                    placeholder="Pilih jenis surat"
                    selectedKeys={formData.letter_type ? [formData.letter_type] : []}
                    onSelectionChange={(keys) => {
                      const k = Array.from(keys)[0] as string;
                      setFormData(f => ({ ...f, letter_type: k }));
                    }}
                    isRequired
                  >
                    {letterTypes.map(t => (
                      <SelectItem key={t.key}>{t.label}</SelectItem>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Waktu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TimeInput
                  label="Waktu Mulai"
                  variant="flat"
                  value={safeParseTime(formData.time_start) || null}
                  onChange={(val) =>
                    setFormData(f => ({ ...f, time_start: val ? val.toString().slice(0,5) : '' }))
                  }
                  hourCycle={24}
                  isRequired
                />
                <TimeInput
                  label="Waktu Selesai"
                  variant="flat"
                  value={safeParseTime(formData.time_end) || null}
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

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alasan/Keterangan
                </label>
                <textarea
                  placeholder="Masukkan alasan atau keterangan tambahan"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </CardBody>
          </Card>

          {/* Daftar Peserta */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Daftar Peserta</h3>
                <Button
                  type="button"
                  color="primary"
                  variant="flat"
                  size="sm"
                  startContent={<IconPlus className="h-4 w-4" />}
                  onPress={handleAddParticipant}
                >
                  Tambah Peserta
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {participants.map((participant, index) => (
                <div key={index} className="flex gap-4 items-end">
                  <Input
                    label="Nama Peserta"
                    placeholder="Masukkan nama peserta"
                    value={participant.name}
                    onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                    className="flex-1"
                    isRequired
                  />
                  
                  <Input
                    label="Kelas"
                    placeholder="Contoh: XII RPL 1"
                    value={participant.class}
                    onChange={(e) => handleParticipantChange(index, 'class', e.target.value)}
                    className="flex-1"
                    isRequired
                  />
                  
                  {participants.length > 1 && (
                    <Button
                      type="button"
                      color="danger"
                      variant="light"
                      isIconOnly
                      onPress={() => handleRemoveParticipant(index)}
                      className="mb-2"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="light"
              onPress={() => router.back()}
              disabled={saving}
            >
              Batal
            </Button>
            
            <Button
              type="submit"
              color="primary"
              startContent={<IconDeviceFloppy className="h-4 w-4" />}
              isLoading={saving}
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}