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

    const handleAddParticipant = () => {
        setParticipants([...participants, { name: '', class: '' }]);
    };

    const handleRemoveParticipant = (index: number) => {
        if (participants.length > 1) {
            setParticipants(participants.filter((_, i) => i !== index));
        }
    };

    const handleParticipantChange = (index: number, field: keyof Participant, value: string) => {
        const updatedParticipants = participants.map((participant, i) =>
            i === index ? { ...participant, [field]: value } : participant
        );
        setParticipants(updatedParticipants);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.activity || !formData.location || !formData.date ||
            !formData.time_start || !formData.time_end) {
            alert('Mohon lengkapi semua field yang wajib diisi');
            return;
        }

        const validParticipants = participants.filter(p => p.name.trim() && p.class.trim());
        if (validParticipants.length === 0) {
            alert('Minimal harus ada satu peserta');
            return;
        }

        try {
            setSaving(true);

            const response = await fetch(`/api/permission-letters/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    participants: validParticipants
                }),
            });

            if (response.ok) {
                router.push(`/letters/permissions/${params.id}`);
            } else {
                const error = await response.json();
                alert(error.message || 'Gagal mengupdate surat');
            }
        } catch (error) {
            console.error('Error updating letter:', error);
            alert('Terjadi kesalahan saat mengupdate surat');
        } finally {
            setSaving(false);
        }
    };

    // Fetch letter data
    useEffect(() => {
        const fetchLetter = async () => {
            try {
                const response = await fetch(`/api/permission-letters/${params.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setLetter(data);

                    // Check if user can edit
                    if (!isAdmin() && data.created_by !== user?.id) {
                        router.push('/letters/permissions');
                        return;
                    }

                    // Set form data
                    setFormData({
                        activity: data.activity,
                        location: data.location,
                        date: data.date,
                        time_start: data.time_start,
                        time_end: data.time_end,
                        letter_type: data.letter_type,
                        reason: data.reason || ''
                    });

                    // Set participants
                    setParticipants(data.participants.length > 0 ? data.participants : [{ name: '', class: '' }]);
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

        if (params.id) {
            fetchLetter();
        }
    }, [params.id, user, isAdmin, router]);

    if (loading) {
        return (
            <AppLayout>
                <div className="flex justify-center items-center min-h-96">
                    <div className="text-center">
                        <Spinner size="lg" color="primary" />
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Surat tidak ditemukan
                    </h2>
                    <Button
                        color="primary"
                        onPress={() => router.push('/letters/permissions')}
                    >
                        Kembali ke Daftar Surat
                    </Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="w-full space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="light"
                        isIconOnly
                        onPress={() => router.back()}
                    >
                        <IconArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Edit Surat Izin
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {letter.letter_number}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Informasi Kegiatan */}
                    <Card className="w-full">
                        <CardHeader>
                            <h3 className="text-lg font-semibold">Informasi Kegiatan</h3>
                        </CardHeader>
                        <CardBody className="space-y-6">
                            {/* Row 1: Jenis Surat & Kegiatan */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select
                                    label="Jenis Surat"
                                    placeholder="Pilih jenis surat"
                                    selectedKeys={[formData.letter_type]}
                                    onSelectionChange={(keys) => {
                                        const selectedType = Array.from(keys)[0] as string;
                                        setFormData({ ...formData, letter_type: selectedType });
                                    }}
                                    isRequired
                                >
                                    {letterTypes.map((type) => (
                                        <SelectItem key={type.key} value={type.key}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </Select>

                                <Input
                                    label="Kegiatan"
                                    placeholder="Nama kegiatan"
                                    value={formData.activity}
                                    onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                                    isRequired
                                />
                            </div>

                            {/* Row 2: Lokasi */}
                            <Input
                                label="Lokasi"
                                placeholder="Lokasi kegiatan"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                isRequired
                            />

                            {/* Row 3: Tanggal & Waktu */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Input
                                    label="Tanggal"
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    isRequired
                                />

                                <Input
                                    label="Waktu Mulai"
                                    type="time"
                                    value={formData.time_start}
                                    onChange={(e) => setFormData({ ...formData, time_start: e.target.value })}
                                    isRequired
                                />

                                <Input
                                    label="Waktu Selesai"
                                    type="time"
                                    value={formData.time_end}
                                    onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
                                    isRequired
                                />
                            </div>

                            {/* Row 4: Alasan */}
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
                    <Card className="w-full">
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
                                        placeholder="Contoh: XII IPA 1"
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