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
import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';
import { parseDate, parseTime } from '@internationalized/date';

interface Participant {
  name: string;
  class: string;
}

interface FormData {
  date: string;        // yyyy-mm-dd
  time_start: string;  // HH:MM
  time_end: string;    // HH:MM
  location: string;
  activity: string;
  letter_type: string;
  reason: string;
  participants: Participant[];
}

export default function CreatePermissionLetterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    date: '',
    time_start: '',
    time_end: '',
    location: '',
    activity: '',
    letter_type: '',
    reason: '',
    participants: [{ name: '', class: '' }]
  });

  const letterTypes = [
    { key: 'dispensasi', label: 'Surat Dispensasi' },
    { key: 'keterangan', label: 'Surat Keterangan' },
    { key: 'surat_tugas', label: 'Surat Tugas' },
    { key: 'lomba', label: 'Surat Izin Lomba' }
  ];

  const handleBack = () => router.back();

  const addParticipant = () =>
    setFormData(f => ({ ...f, participants: [...f.participants, { name: '', class: '' }] }));

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
    setLoading(true);
    try {
      const response = await fetch('/api/permission-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, created_by: user?.id || 'system' })
      });
      if (response.ok) router.push('/letters/permissions');
      else {
        const error = await response.json();
        alert(error.error || 'Gagal menyimpan surat');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan surat');
    } finally {
      setLoading(false);
    }
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
              Buat Surat Izin
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Buat surat izin baru untuk siswa atau kegiatan sekolah
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
                  {/* Date */}
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tanggal Kegiatan
                    </span>
                    <DatePicker
                      aria-label="Tanggal Kegiatan"
                      variant="flat"
                      value={formData.date ? parseDate(formData.date) : null}
                      onChange={(val) =>
                        setFormData(f => ({ ...f, date: val ? val.toString() : '' }))
                      }
                      isRequired
                      placeholderValue={parseDate(
                        new Date().toISOString().slice(0, 10)
                      )}
                      className="w-full"
                      granularity="day"
                    />
                  </div>

                  {/* Letter Type */}
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

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Alasan/Keterangan
                  </label>
                  <textarea
                    placeholder="Masukkan alasan atau keterangan tambahan"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    autoComplete="off"
                    className="
                      w-full
                      rounded-lg
                      border border-gray-300 dark:border-gray-600
                      bg-white dark:bg-gray-800
                      text-gray-900 dark:text-white
                      placeholder-gray-500 dark:placeholder-gray-400
                      px-3 py-2
                      focus:outline-none
                      focus:ring-2 focus:ring-blue-500/60
                      focus:border-blue-500
                      focus:bg-white dark:focus:bg-gray-800
                      [::-webkit-autofill]:shadow-[inset_0_0_0_1000px_theme(colors.white)]
                      dark:[::-webkit-autofill]:shadow-[inset_0_0_0_1000px_theme(colors.gray.800)]
                      [::-webkit-autofill]:text-fill-black
                      dark:[::-webkit-autofill]:text-fill-white
                      transition
                      resize-none
                    "
                  />
                </div>
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
                    label="Nama Peserta"
                    placeholder="Masukkan nama peserta"
                    value={participant.name}
                    onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Input
                    label="Kelas"
                    placeholder="Contoh: XII IPA 1"
                    value={participant.class}
                    onChange={(e) => updateParticipant(index, 'class', e.target.value)}
                    className="flex-1"
                    required
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