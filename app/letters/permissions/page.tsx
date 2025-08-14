'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';

import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Chip } from '@heroui/chip';
import { Select, SelectItem } from '@heroui/select';
import { Input } from '@heroui/input';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter
} from '@heroui/modal';

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

interface Participant {
  id: string;
  name: string;
  class: string;
}

interface Creator {
  id: string;
  name: string;
  email: string;
}

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
  creator: Creator;
  participants: Participant[];
}

type HeroUIColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

const statusColor = (status: string): HeroUIColor =>
  ({
    approved: 'success',
    rejected: 'danger',
    pending: 'warning',
    draft: 'default'
  }[status] as HeroUIColor) || 'default';

const statusLabel = (status: string) =>
  ({
    approved: 'Disetujui',
    rejected: 'Ditolak',
    pending: 'Menunggu',
    draft: 'Draft'
  }[status] || status);

const typeLabel = (type: string) =>
  ({
    dispensasi: 'Dispensasi',
    keterangan: 'Keterangan',
    surat_tugas: 'Surat Tugas',
    lomba: 'Izin Lomba'
  }[type] || type);

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export default function PermissionLettersPage() {
  const { user, isAdmin } = useAuth();
  const [letters, setLetters] = useState<PermissionLetter[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [letterToDelete, setLetterToDelete] = useState<PermissionLetter | null>(null);
  const [deleting, setDeleting] = useState(false);

  const letterTypes = useMemo(
    () => [
      { key: '', label: 'Semua Jenis' },
      { key: 'dispensasi', label: 'Surat Dispensasi' },
      { key: 'keterangan', label: 'Surat Keterangan' },
      { key: 'surat_tugas', label: 'Surat Tugas' },
      { key: 'lomba', label: 'Surat Izin Lomba' }
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { key: '', label: 'Semua Status' },
      { key: 'draft', label: 'Draft' },
      { key: 'pending', label: 'Menunggu' },
      { key: 'approved', label: 'Disetujui' },
      { key: 'rejected', label: 'Ditolak' }
    ],
    []
  );

  const fetchLetters = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (!isAdmin() && user.id) params.append('created_by', user.id);
      const res = await fetch(`/api/permission-letters?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let list: PermissionLetter[] = Array.isArray(data.letters) ? data.letters : [];

        // fallback filter user
        if (!isAdmin() && user.id) list = list.filter(l => l.created_by === user.id);

        // TEMUKAN surat approved / rejected -> ubah ke draft
        const toDraft = list.filter(l => l.status === 'approved' || l.status === 'rejected');
        if (toDraft.length) {
          // update paralel (silent)
            await Promise.all(
              toDraft.map(l =>
                fetch(`/api/permission-letters/${l.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'draft' })
                }).catch(() => null)
              )
            );
          // buang dari tampilan utama (hanya sisakan pending)
          list = list.filter(l => l.status === 'pending');
        } else {
          // jika tidak ada yang dipindah tapi user memilih filter status tertentu, tetap hormati
          list = list.filter(l => l.status === 'pending');
        }

        setLetters(list);
      } else {
        setLetters([]);
      }
    } catch (e) {
      console.error('Error fetching letters:', e);
      setLetters([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters]);

  const askDelete = useCallback(
    (letter: PermissionLetter) => {
      if (!isAdmin()) {
        alert('Hanya admin yang dapat menghapus surat');
        return;
      }
      setLetterToDelete(letter);
      setConfirmOpen(true);
    },
    [isAdmin]
  );

  const confirmDelete = useCallback(async () => {
    if (!letterToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/permission-letters/${letterToDelete.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        alert('Gagal menghapus surat');
      } else {
        setConfirmOpen(false);
        setLetterToDelete(null);
        fetchLetters();
      }
    } catch (e) {
      console.error('Error deleting letter:', e);
      alert('Terjadi kesalahan saat menghapus surat');
    } finally {
      setDeleting(false);
    }
  }, [letterToDelete, fetchLetters]);

  const canEditOrDelete = (letter: PermissionLetter) =>
    isAdmin() || letter.created_by === user?.id;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Surat Izin
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Kelola surat izin siswa dan kegiatan sekolah
            </p>
          </div>
            <Button
              as={Link}
              href="/letters/permissions/create"
              color="primary"
              startContent={<IconPlus className="h-5 w-5" />}
            >
              Buat Surat Izin
            </Button>
        </div>

        {/* Filter */}
        <Card>
          <CardBody className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Input
                placeholder="Cari surat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                startContent={<IconSearch className="h-4 w-4 text-gray-400" />}
              />
              <Select
                placeholder="Filter Jenis"
                selectedKeys={typeFilter ? [typeFilter] : []}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0] as string;
                  setTypeFilter(key || '');
                }}
                startContent={<IconFilter className="h-4 w-4" />}
              >
                {letterTypes.map((t) => (
                  <SelectItem key={t.key}>{t.label}</SelectItem>
                ))}
              </Select>
              <Select
                placeholder="Filter Status"
                selectedKeys={statusFilter ? [statusFilter] : []}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0] as string;
                  setStatusFilter(key || '');
                }}
                startContent={<IconFilter className="h-4 w-4" />}
              >
                {statusOptions.map((s) => (
                  <SelectItem key={s.key}>{s.label}</SelectItem>
                ))}
              </Select>
              <div className="flex items-stretch">
                {search || typeFilter || statusFilter ? (
                  <Button
                    fullWidth
                    variant="flat"
                    onPress={() => {
                      setSearch('');
                      setTypeFilter('');
                      setStatusFilter('');
                    }}
                  >
                    Reset Filter
                  </Button>
                ) : (
                  <Button fullWidth variant="bordered" isDisabled>
                    Tidak ada filter
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* List */}
        <div className="space-y-4">
          {loading && (
            <Card>
              <CardBody className="py-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Memuat surat...
                </p>
              </CardBody>
            </Card>
          )}

          {!loading && letters.length === 0 && (
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
          )}

          {!loading &&
            letters.map((letter) => (
              // sekarang hanya pending yang muncul
              <Card
                key={letter.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardBody className="p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mr-2">
                          {letter.letter_number}
                        </h3>
                        <Chip
                          color={statusColor(letter.status)}
                          size="sm"
                          variant="flat"
                        >
                          {statusLabel(letter.status)}
                        </Chip>
                        <Chip size="sm" variant="bordered">
                          {typeLabel(letter.letter_type)}
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

                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <IconUser className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Dibuat oleh:
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {letter.creator?.name || '-'}
                        </span>
                        {letter.creator?.email && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({letter.creator.email})
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Peserta:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(letter.participants || []).map((p) => (
                            <Chip key={p.id} size="sm" variant="flat">
                              {p.name} ({p.class})
                            </Chip>
                          ))}
                          {(!letter.participants ||
                            letter.participants.length === 0) && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Tidak ada peserta
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row lg:flex-col gap-2 shrink-0">
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
                          onPress={() => askDelete(letter)}
                        >
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>

        {/* Modal Konfirmasi Hapus */}
        <Modal
          isOpen={confirmOpen}
          onOpenChange={(open) => {
            if (!open && !deleting) {
              setConfirmOpen(false);
              setLetterToDelete(null);
            }
          }}
          placement="center"
          hideCloseButton={deleting}
        >
          <ModalContent>
            {() => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  Konfirmasi Hapus
                </ModalHeader>
                <ModalBody>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Anda yakin ingin menghapus surat{' '}
                    <span className="font-semibold">
                      {letterToDelete?.letter_number}
                    </span>
                    ? Tindakan ini tidak dapat dibatalkan.
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button
                    variant="light"
                    onPress={() => {
                      if (!deleting) {
                        setConfirmOpen(false);
                        setLetterToDelete(null);
                      }
                    }}
                    disabled={deleting}
                  >
                    Batal
                  </Button>
                  <Button
                    color="danger"
                    onPress={confirmDelete}
                    isLoading={deleting}
                    disabled={deleting}
                  >
                    {deleting ? 'Menghapus...' : 'Hapus'}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </AppLayout>
  );
}