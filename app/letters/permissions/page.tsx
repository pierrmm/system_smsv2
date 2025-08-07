'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { Chip } from '@heroui/chip';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { AppLayout } from '@/components/AppLayout';
import { Select, SelectItem } from '@heroui/select';
import { Input } from '@heroui/input';
import { 
  IconPlus, 
  IconSearch, 
  IconEye,
  IconEdit,
  IconTrash,
  IconDownload,
  IconFilter,
  IconUser
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionLetter {
  id: string;
  letter_number: string;
  activity: string;
  location: string;
  date: string;
  letter_type: string;
  status: string;
  created_at: string;
  created_by: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  participants: Array<{
    id: string;
    name: string;
    class: string;
  }>;
}

export default function PermissionLettersPage() {
  const { user, isAdmin } = useAuth();
  const [letters, setLetters] = useState<PermissionLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const letterTypes = [
    { key: '', label: 'Semua Jenis' },
    { key: 'dispensasi', label: 'Surat Dispensasi' },
    { key: 'keterangan', label: 'Surat Keterangan' },
    { key: 'surat_tugas', label: 'Surat Tugas' },
    { key: 'lomba', label: 'Surat Izin Lomba' }
  ];

  const statusOptions = [
    { key: '', label: 'Semua Status' },
    { key: 'draft', label: 'Draft' },
    { key: 'pending', label: 'Menunggu' },
    { key: 'approved', label: 'Disetujui' },
    { key: 'rejected', label: 'Ditolak' }
  ];

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/permission-letters?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLetters(data.letters || []);
      }
    } catch (error) {
      console.error('Error fetching letters:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLetters();
  }, [search, typeFilter, statusFilter]);

  const handleDelete = async (letterId: string) => {
    if (!isAdmin()) {
      alert('Hanya admin yang dapat menghapus surat');
      return;
    }

    if (confirm('Apakah Anda yakin ingin menghapus surat ini?')) {
      try {
        const response = await fetch(`/api/permission-letters/${letterId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await fetchLetters();
        } else {
          alert('Gagal menghapus surat');
        }
      } catch (error) {
        console.error('Error deleting letter:', error);
        alert('Terjadi kesalahan saat menghapus surat');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'pending': return 'Menunggu';
      case 'draft': return 'Draft';
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'dispensasi': return 'Dispensasi';
      case 'keterangan': return 'Keterangan';
      case 'surat_tugas': return 'Surat Tugas';
      case 'lomba': return 'Izin Lomba';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const canEditOrDelete = (letter: PermissionLetter) => {
    return isAdmin() || letter.created_by === user?.id;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Surat Izin
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Kelola surat izin siswa dan kegiatan sekolah
            </p>
          </div>
          <Link href="/letters/permissions/create">
            <Button
              color="primary"
              startContent={<IconPlus className="h-5 w-5" />}
            >
              Buat Surat Izin
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardBody className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <Input
                placeholder="Cari surat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                startContent={<IconSearch className="h-4 w-4 text-gray-400" />}
                className="flex-1"
              />
              
              <Select
                placeholder="Filter Jenis"
                selectedKeys={typeFilter ? [typeFilter] : []}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0] as string;
                  setTypeFilter(selectedKey || '');
                }}
                className="min-w-48"
                startContent={<IconFilter className="h-4 w-4" />}
              >
                {letterTypes.map((type) => (
                  <SelectItem key={type.key} value={type.key}>
                    {type.label}
                  </SelectItem>
                ))}
              </Select>

              <Select
                placeholder="Filter Status"
                selectedKeys={statusFilter ? [statusFilter] : []}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0] as string;
                  setStatusFilter(selectedKey || '');
                }}
                className="min-w-48"
                startContent={<IconFilter className="h-4 w-4" />}
              >
                {statusOptions.map((status) => (
                  <SelectItem key={status.key} value={status.key}>
                    {status.label}
                  </SelectItem>
                ))}
              </Select>

              {(search || typeFilter || statusFilter) && (
                <Button
                  variant="light"
                  onPress={() => {
                    setSearch('');
                    setTypeFilter('');
                    setStatusFilter('');
                  }}
                >
                  Reset Filter
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Letters List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Memuat surat...</p>
            </div>
          ) : letters.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <IconSearch className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Tidak ada surat ditemukan
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Coba ubah filter pencarian atau buat surat baru
                </p>
              </CardBody>
            </Card>
          ) : (
            letters.map((letter) => (
              <Card key={letter.id} className="hover:shadow-md transition-shadow">
                <CardBody className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {letter.letter_number}
                        </h3>
                        <Chip
                          color={getStatusColor(letter.status)}
                          size="sm"
                          variant="flat"
                        >
                          {getStatusLabel(letter.status)}
                        </Chip>
                        <Chip size="sm" variant="bordered">
                          {getTypeLabel(letter.letter_type)}
                        </Chip>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                                                   <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Kegiatan:
                          </p>
                          <p className="text-gray-900 dark:text-white">
                            {letter.activity}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Lokasi:
                          </p>
                          <p className="text-gray-900 dark:text-white">
                            {letter.location}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Tanggal:
                          </p>
                          <p className="text-gray-900 dark:text-white">
                            {formatDate(letter.date)}
                          </p>
                        </div>
                      </div>

                      {/* Creator Info */}
                      <div className="flex items-center gap-2 mb-4">
                        <IconUser className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Dibuat oleh:
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {letter.creator.name}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({letter.creator.email})
                        </span>
                      </div>

                      {/* Participants */}
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Peserta:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {letter.participants.map((participant, index) => (
                            <Chip key={participant.id} size="sm" variant="flat">
                              {participant.name} ({participant.class})
                            </Chip>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="light"
                        color="primary"
                        isIconOnly
                        as={Link}
                        href={`/letters/permissions/${letter.id}`}
                      >
                        <IconEye className="h-4 w-4" />
                      </Button>
                      
                      {canEditOrDelete(letter) && (
                        <Button
                          size="sm"
                          variant="light"
                          color="warning"
                          isIconOnly
                          as={Link}
                          href={`/letters/permissions/${letter.id}/edit`}
                        >
                          <IconEdit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {isAdmin() && (
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          isIconOnly
                          onPress={() => handleDelete(letter.id)}
                        >
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="light"
                        color="success"
                        isIconOnly
                      >
                        <IconDownload className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}