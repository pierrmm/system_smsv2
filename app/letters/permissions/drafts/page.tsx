'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import Loading from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import { Pagination } from '@heroui/pagination';
import { IconSearch, IconEdit, IconEye, IconPlus, IconFilter } from '@tabler/icons-react';

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
  letter_type: string;
  status: string;
  created_at: string;
  created_by: string;
  participants: Participant[];
}

const typeLabel = (t: string) => ({
  dispensasi: 'Dispensasi',
  keterangan: 'Keterangan',
  surat_tugas: 'Surat Tugas',
  lomba: 'Izin Lomba'
}[t] || t);

const formatDate = (d: string) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function DraftLettersPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [letters, setLetters] = useState<PermissionLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'az' | 'za'>('latest');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const fetchDrafts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (!isAdmin() && user.id) params.append('created_by', user.id);
      params.append('limit', '200'); // opsional
      const res = await fetch(`/api/permission-letters?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let list: PermissionLetter[] = Array.isArray(data.letters) ? data.letters : [];

        // Filter kepemilikan (fallback)
        if (!isAdmin()) list = list.filter(l => l.created_by === user.id);

        // Cari yang perlu dikonversi jadi draft (approved / rejected)
        const needConvert = list.filter(
          l => (l.status === 'approved' || l.status === 'rejected')
            && (isAdmin() || l.created_by === user.id)
        );

        if (needConvert.length) {
          await Promise.all(
            needConvert.map(l =>
              fetch(`/api/permission-letters/${l.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'draft' })
              }).catch(() => null)
            )
          );
          // Tandai lokal tanpa menunggu refetch penuh
          list = list.map(l =>
            needConvert.find(x => x.id === l.id)
              ? { ...l, status: 'draft' }
              : l
          );
        }

        // Sisakan hanya draft
        list = list.filter(l => l.status === 'draft');

        setLetters(list);
      } else {
        setLetters([]);
      }
    } catch {
      setLetters([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  // Require login: redirect to login with return path
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent('/letters/permissions/drafts')}`);
    }
  }, [authLoading, user, router]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = letters.filter(l =>
      !ql ||
      l.letter_number?.toLowerCase().includes(ql) ||
      l.activity?.toLowerCase().includes(ql)
    );
    if (typeFilter) list = list.filter(l => l.letter_type === typeFilter);
    // sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'latest') return (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0);
      if (sortBy === 'oldest') return (new Date(a.date).getTime() || 0) - (new Date(b.date).getTime() || 0);
      const an = (a.letter_number || '').localeCompare(b.letter_number || '');
      return sortBy === 'az' ? an : -an;
    });
    return list;
  }, [letters, q, typeFilter, sortBy]);

  // Reset ke halaman 1 jika filter berubah
  useEffect(() => { setPage(1); }, [q, typeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const current = filtered.slice(start, start + pageSize);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Draft Surat</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isAdmin() ? 'Semua draft surat.' : 'Draft surat milik Anda.'}
            </p>
          </div>
          <Button
            as={Link}
            href="/letters/permissions/create"
            variant="solid"
            color="default"
            className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 font-medium"
            startContent={<IconPlus className="h-5 w-5" />}
          >
            Baru
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardBody className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Cari draft..."
                size="sm"
                startContent={<IconSearch className="h-4 w-4 text-gray-400" />}
              />
              <Select
                aria-label="Filter Jenis Surat"
                placeholder="Jenis Surat"
                selectedKeys={typeFilter ? [typeFilter] : []}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0] as string;
                  setTypeFilter(key || '');
                }}
                startContent={<IconFilter className="h-4 w-4" />}
              >
                <SelectItem key="">Semua Jenis</SelectItem>
                <SelectItem key="dispensasi">Surat Dispensasi</SelectItem>
                <SelectItem key="keterangan">Surat Keterangan</SelectItem>
                <SelectItem key="surat_tugas">Surat Tugas</SelectItem>
                <SelectItem key="lomba">Surat Izin Lomba</SelectItem>
              </Select>
              <Select
                aria-label="Urutkan"
                placeholder="Urutkan"
                selectedKeys={[sortBy]}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0] as string;
                  setSortBy((key as any) || 'latest');
                }}
                startContent={<IconFilter className="h-4 w-4" />}
              >
                <SelectItem key="latest">Terbaru</SelectItem>
                <SelectItem key="oldest">Terlama</SelectItem>
                <SelectItem key="az">Nomor A → Z</SelectItem>
                <SelectItem key="za">Nomor Z → A</SelectItem>
              </Select>
              <div className="flex items-stretch">
                {(q || typeFilter || sortBy !== 'latest') ? (
                  <Button
                    fullWidth
                    variant="flat"
                    onPress={() => { setQ(''); setTypeFilter(''); setSortBy('latest'); }}
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

        {/* Info / state */}
        {loading && (
          <div className="py-12">
            <Loading message="Memuat draft..." />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-600 dark:text-gray-400 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
            Tidak ada draft
          </div>
        )}

        {/* Grid Drafts */}
        {!loading && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {current.map(d => (
              <Card
                key={d.id}
                radius="sm"
                className="relative border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:shadow-md transition-shadow"
              >
                <CardBody className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {d.letter_number || '(Belum ada nomor)'}
                      </span>
                      <Chip
                        size="sm"
                        variant="flat"
                        color="default"
                        className="bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100"
                      >
                        Draft
                      </Chip>
                      <Chip
                        size="sm"
                        variant="bordered"
                        className="border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200"
                      >
                        {typeLabel(d.letter_type)}
                      </Chip>
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                      {d.activity} • {formatDate(d.date)} • {d.participants?.length || 0} peserta
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      as={Link}
                      href={`/letters/permissions/${d.id}`}
                      size="sm"
                      isIconOnly
                      variant="flat"
                      color="default"
                      className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200"
                      aria-label="Detail"
                    >
                      <IconEye className="h-4 w-4" />
                    </Button>
                    <Button
                      as={Link}
                      href={`/letters/permissions/${d.id}/edit`}
                      size="sm"
                      isIconOnly
                      variant="flat"
                      color="default"
                      className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200"
                      aria-label="Edit"
                    >
                      <IconEdit className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Focus Ring Overlay for accessibility */}
                  <Link
                    href={`/letters/permissions/${d.id}`}
                    aria-label="Buka Detail Draft"
                    className="absolute inset-0 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800 dark:focus-visible:outline-neutral-200"
                  />
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > pageSize && (
          <div className="flex justify-center pt-2">
            <Pagination
              page={page}
              total={totalPages}
              onChange={setPage}
              showControls
              showShadow
              variant="bordered"
              classNames={{ cursor: 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' }}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
                      
