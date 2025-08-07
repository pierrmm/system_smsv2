'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { Chip } from '@heroui/chip';
import { 
  IconPlus, 
  IconSearch, 
  IconEye,
  IconEdit,
  IconTrash,
  IconDownload,
  IconFilter
} from '@tabler/icons-react';
import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';

interface PermissionLetter {
  id: number;
  letter_number: string;
  date: string;
  activity: string;
  location: string;
  letter_type: string;
  status: string;
  participants: Array<{
    id: number;
    name: string;
    class: string;
  }>;
  createdBy: {
    name: string;
  };
  createdAt: string;
}

export default function PermissionLettersPage() {
  const [letters, setLetters] = useState<PermissionLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const letterTypes = [
    { key: '', label: 'Semua Jenis' },
    { key: 'izin_sakit', label: 'Izin Sakit' },
    { key: 'izin_keluarga', label: 'Izin Keluarga' },
    { key: 'izin_kegiatan', label: 'Izin Kegiatan' },
    { key: 'izin_organisasi', label: 'Izin Organisasi' },
    { key: 'izin_lainnya', label: 'Izin Lainnya' }
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
    const typeObj = letterTypes.find(t => t.key === type);
    return typeObj ? typeObj.label : type;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Surat Izin
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Kelola surat izin siswa dan kegiatan sekolah
            </p>
          </div>
          <Link href="/letters/permissions/create">
            <Button
              color="primary"
              startContent={<IconPlus className="h-4 w-4" />}
            >
              Buat Surat Izin
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Cari surat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                startContent={<IconSearch className="h-4 w-4 text-gray-400" />}
              />
              
              <Select
                placeholder="Filter Jenis"
                selectedKeys={typeFilter ? [typeFilter] : []}
                onSelectionChange={(keys) => setTypeFilter(Array.from(keys)[0] as string || '')}
                startContent={<IconFilter className="h-4 w-4 text-gray-400" />}
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
                onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] as string || '')}
                startContent={<IconFilter className="h-4 w-4 text-gray-400" />}
              >
                {statusOptions.map((status) => (
                  <SelectItem key={status.key} value={status.key}>
                    {status.label}
                  </SelectItem>
                ))}
              </Select>

              <Button
                variant="flat"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('');
                  setStatusFilter('');
                }}
              >
                Reset Filter
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Letters List */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardBody className="text-center py-8">
                <p className="text-gray-500">Memuat data...</p>
              </CardBody>
            </Card>
          ) : letters.length === 0 ? (
            <Card>
              <CardBody className="text-center py-8">
                <p className="text-gray-500">Tidak ada surat izin ditemukan</p>
                <Link href="/letters/permissions/create" className="mt-4 inline-block">
                  <Button color="primary" startContent={<IconPlus className="h-4 w-4" />}>
                    Buat Surat Izin Pertama
                  </Button>
                </Link>
              </CardBody>
            </Card>
          ) : (
            letters.map((letter) => (
              <Card key={letter.id}>
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <span className="font-medium">Kegiatan:</span>
                          <p>{letter.activity}</p>
                        </div>
                        <div>
                          <span className="font-medium">Lokasi:</span>
                          <p>{letter.location}</p>
                        </div>
                        <div>
                          <span className="font-medium">Tanggal:</span>
                          <p>{new Date(letter.date).toLocaleDateString('id-ID')}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className="font-medium text-sm">Peserta:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {letter.participants.slice(0, 3).map((participant) => (
                            <Chip key={participant.id} size="sm" variant="flat">
                              {participant.name} ({participant.class})
                                                          </Chip>
                          ))}
                          {letter.participants.length > 3 && (
                            <Chip size="sm" variant="flat" color="default">
                              +{letter.participants.length - 3} lainnya
                            </Chip>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Link href={`/letters/permissions/${letter.id}`}>
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          isIconOnly
                          startContent={<IconEye className="h-4 w-4" />}
                        />
                      </Link>
                      <Link href={`/letters/permissions/${letter.id}/edit`}>
                        <Button
                          size="sm"
                          variant="flat"
                          color="warning"
                          isIconOnly
                          startContent={<IconEdit className="h-4 w-4" />}
                        />
                      </Link>
                      <Button
                        size="sm"
                        variant="flat"
                        color="success"
                        isIconOnly
                        startContent={<IconDownload className="h-4 w-4" />}
                        onClick={() => {
                          // TODO: Implement download PDF
                          console.log('Download PDF for letter:', letter.id);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="flat"
                        color="danger"
                        isIconOnly
                        startContent={<IconTrash className="h-4 w-4" />}
                        onClick={() => {
                          // TODO: Implement delete confirmation
                          console.log('Delete letter:', letter.id);
                        }}
                      />
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