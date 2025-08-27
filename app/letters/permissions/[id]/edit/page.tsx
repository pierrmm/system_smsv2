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
  reason?: string; // baru
}

interface PermissionLetter {
  id: string;
  letter_number: string;
  activity: string;
  location: string;
  date: string;          // legacy
  date_start?: string;   // baru
  date_end?: string;     // baru
  time_start: string;
  time_end: string;
  letter_type: string;
  status: string;
  created_by: string;
  reason?: string;
  participants: Participant[];
}

const META_PREFIX = '__META__:'; // tambahkan untuk parsing fallback meta
function extractMeta(reasonFull: string | undefined) {
  const result: any = {};
  if (!reasonFull) return result;
  const lines = reasonFull.split('\n');
  lines.forEach(l => {
    if (l.startsWith(META_PREFIX)) {
      try {
        const obj = JSON.parse(l.slice(META_PREFIX.length));
        Object.assign(result, obj);
      } catch { /* ignore */ }
    }
  });
  return result;
}
function stripMeta(reasonFull: string | undefined) {
  if (!reasonFull) return '';
  return reasonFull
    .split('\n')
    .filter(l => !l.startsWith(META_PREFIX))
    .join('\n')
    .trim();
}

function normalizeDateString(d?: string): string {
  if (!d) return '';
  return d.slice(0, 10); // yyyy-mm-dd
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
    date_start: '',
    date_end: '',
    time_start: '',
    time_end: '',
    letter_type: 'dispensasi'
  });

  const [participants, setParticipants] = useState<Participant[]>([
    { name: '', class: '', reason: '' }
  ]);

  const [supportsParticipantReason, setSupportsParticipantReason] = useState(false); // deteksi dukungan kolom reason peserta
  const [baseGlobalReason, setBaseGlobalReason] = useState(''); // simpan reason global tanpa meta

  const letterTypes = [
    { key: 'dispensasi', label: 'Surat Dispensasi' },
    { key: 'keterangan', label: 'Surat Keterangan' },
    { key: 'surat_tugas', label: 'Surat Tugas' },
    { key: 'lomba', label: 'Surat Izin Lomba' }
  ];

  const handleAddParticipant = () =>
    setParticipants(p => [...p, { name: '', class: '', reason: '' }]);

  const handleRemoveParticipant = (index: number) => {
    setParticipants(p => p.length > 1 ? p.filter((_, i) => i !== index) : p);
  };

  const handleParticipantChange = (index: number, field: keyof Participant, value: string) => {
    setParticipants(p => p.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.activity || !formData.location || !formData.date_start || !formData.date_end ||
        !formData.time_start || !formData.time_end) {
      alert('Mohon lengkapi field wajib.');
      return;
    }
    if (formData.date_start > formData.date_end) {
      alert('Tanggal mulai tidak boleh lebih besar dari tanggal selesai.');
      return;
    }
    const validParticipants = participants.filter(p => p.name.trim() && p.class.trim());
    if (validParticipants.length === 0) {
      alert('Minimal satu peserta.');
      return;
    }
    try {
      setSaving(true);

      const payloadParticipants = participants.map(p => {
        const base: any = {
          id: p.id,
          name: p.name.trim(),
          class: p.class.trim()
        };
        if (supportsParticipantReason) {
          base.reason = (p.reason || '').trim();
        }
        return base;
      });

      // SELALU rebuild meta agar perubahan reason peserta tercermin
      const meta: any = {};
      const participantMeta = participants
        .map(p => ({ name: p.name.trim(), reason: (p.reason || '').trim() }))
        .filter(pm => pm.reason);
      if (participantMeta.length) meta.participants = participantMeta;
      if (formData.date_start && formData.date_end && formData.date_end !== formData.date_start) {
        meta.date_range = { start: formData.date_start, end: formData.date_end };
      }

      let reasonFinal = stripMeta(baseGlobalReason); // bersihkan kemungkinan meta lama
      const metaLine = META_PREFIX + JSON.stringify(meta);
      if (Object.keys(meta).length) {
        reasonFinal = reasonFinal ? `${reasonFinal}\n${metaLine}` : metaLine;
      }

      const payload: any = {
        activity: formData.activity,
        location: formData.location,
        date: formData.date_start,
        date_start: formData.date_start,
        date_end: formData.date_end,
        time_start: formData.time_start,
        time_end: formData.time_end,
        letter_type: formData.letter_type,
        participants: payloadParticipants
      };
      if (reasonFinal) payload.reason = reasonFinal;

      console.debug('[EDIT LETTER] submit payload:', payload);

      const res = await fetch(`/api/permission-letters/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        router.push(`/letters/permissions/${params.id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || err.error || 'Gagal mengupdate surat');
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

        // Ambil & proses meta ( SELALU ), lalu base reason tanpa meta
        const metaMerged = extractMeta(data.reason);
        const baseReasonClean = stripMeta(data.reason);
        setBaseGlobalReason(baseReasonClean);

        // Deteksi apakah kolom reason peserta tersedia (bukan hanya meta)
        const hasParticipantReasonColumn = data.participants.some(p =>
          Object.prototype.hasOwnProperty.call(p, 'reason')
        );
        setSupportsParticipantReason(hasParticipantReasonColumn);

        // Normalisasi tanggal
        let ds = normalizeDateString(data.date_start || data.date);
        let de = normalizeDateString(data.date_end || data.date_start || data.date);
        if (!data.date_start && metaMerged.date_range?.start) {
          ds = normalizeDateString(metaMerged.date_range.start);
        }
        if (!data.date_end && metaMerged.date_range?.end) {
          de = normalizeDateString(metaMerged.date_range.end);
        }
        if (de < ds) de = ds;

        // Map reason peserta dari meta (jika ada)
        const participantReasonMap: Record<string, string> = {};
        if (Array.isArray(metaMerged.participants)) {
          metaMerged.participants.forEach((m: any) => {
            if (m?.name && m?.reason) participantReasonMap[m.name] = m.reason;
          });
        }

        let loadedParticipants = (data.participants || []).map(p => {
          const existing = (p.reason || '').trim();
            const fromMeta = participantReasonMap[p.name] || '';
            return {
              ...p,
              reason: existing || fromMeta || ''
            };
        });

        // Debug
        console.debug('[EDIT LETTER] metaMerged:', metaMerged);
        console.debug('[EDIT LETTER] participantReasonMap:', participantReasonMap);
        console.debug('[EDIT LETTER] participants after merge:', loadedParticipants);

        setFormData(f => ({
          ...f,
          activity: data.activity,
          location: data.location,
          date_start: ds,
          date_end: de,
          time_start: data.time_start,
          time_end: data.time_end,
          letter_type: data.letter_type
        }));

        setParticipants(
          loadedParticipants.length
            ? loadedParticipants
            : [{ name: '', class: '', reason: '' }]
        );
      } catch (e) {
        console.error(e);
        router.push('/letters/permissions');
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchLetter();
  }, [params.id, user, isAdmin, router]);
  
  const todayIso = new Date().toISOString().slice(0,10);

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
              Edit Pengajuan Surat
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
                {/* Tanggal Mulai */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tanggal Mulai
                  </span>
                  <DatePicker
                    aria-label="Tanggal Mulai"
                    variant="flat"
                    value={safeParseDate(formData.date_start) || null}
                    minValue={parseDate(todayIso)}
                    onChange={(val) =>
                      setFormData(f => {
                        const newStart = val ? val.toString() : '';
                        // Jika end sebelum start, sesuaikan
                        const fixedEnd = f.date_end && f.date_end < newStart ? newStart : f.date_end;
                        return { ...f, date_start: newStart, date_end: fixedEnd };
                      })
                    }
                    placeholderValue={parseDate(new Date().toISOString().slice(0,10))}
                    isRequired
                    granularity="day"
                  />
                </div>
                {/* Tanggal Selesai */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tanggal Selesai
                  </span>
                  <DatePicker
                    aria-label="Tanggal Selesai"
                    variant="flat"
                    value={safeParseDate(formData.date_end) || null}
                    minValue={parseDate(formData.date_start || todayIso)}
                    onChange={(val) =>
                      setFormData(f => ({ ...f, date_end: val ? val.toString() : '' }))
                    }
                    placeholderValue={parseDate(new Date().toISOString().slice(0,10))}
                    isRequired
                    granularity="day"
                  />
                </div>
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
                  onPress={handleAddParticipant}
                >
                  Tambah Peserta
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {participants.map((participant, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-4">
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
                  <Input
                    label="Keterangan"
                    placeholder="Keterangan / alasan peserta"
                    value={participant.reason}
                    onChange={(e) => handleParticipantChange(index, 'reason', e.target.value)}
                    className="flex-1"
                  />
                  {participants.length > 1 && (
                    <div className="flex items-end">
                      <Button
                        type="button"
                        color="danger"
                        variant="light"
                        isIconOnly
                        onPress={() => handleRemoveParticipant(index)}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>
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