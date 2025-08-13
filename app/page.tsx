'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';

import { Card, CardHeader, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import { Skeleton } from '@heroui/skeleton';
import { Tooltip } from '@heroui/tooltip';

import {
  IconFileText,
  IconUsers,
  IconPlus,
  IconClock,
  IconCalendar,
  IconMapPin,
  IconEye,
  IconEdit,
  IconRefresh,
  IconChevronRight,
  IconArrowUpRight,
  IconArrowDownRight
} from '@tabler/icons-react';

/* Design Tokens (sederhana) */
const TOKENS = {
  radius: 'rounded-md',
  cardPadding: 'p-4',
  gap: 'gap-4',
  textMuted: 'text-gray-600 dark:text-gray-400',
  border: 'border border-gray-200 dark:border-gray-700',
  bgSoft: 'bg-white dark:bg-gray-800'
};

interface DashboardStats {
  totalLetters: number;
  pendingLetters: number;
  approvedLetters: number;
  rejectedLetters: number;
  totalUsers: number;
  previous?: {
    totalLetters?: number;
    pendingLetters?: number;
    approvedLetters?: number;
    rejectedLetters?: number;
  };
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
  participants: Array<{ id: string; name: string; class: string }>;
  created_by?: string; // ditambahkan
}

type StatusKey = 'approved' | 'pending' | 'rejected' | 'draft';

const statusColor = (status: string) =>
  ({
    approved: 'success',
    rejected: 'danger',
    pending: 'warning',
    draft: 'default'
  }[status] || 'default');

const statusLabel = (status: string) =>
  ({
    approved: 'Disetujui',
    rejected: 'Ditolak',
    pending: 'Menunggu',
    draft: 'Draft'
  }[status] || status);

const typeLabel = (t: string) =>
  ({
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

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLetters, setRecentLetters] = useState<PermissionLetter[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusKey | 'all'>('all');
  // pagination dihapus: hanya tampilkan 4 item

  const isAdmin = () => user?.role === 'admin';

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoadingData(true);
      const statsUrl = isAdmin()
        ? '/api/dashboard/stats?withPrevious=1'
        : `/api/dashboard/stats?withPrevious=1&created_by=${user?.id}`;
      const lettersUrl = isAdmin()
        ? '/api/permission-letters?limit=50'
        : `/api/permission-letters?limit=50&created_by=${user?.id}`;
      const [statsRes, lettersRes] = await Promise.all([
        fetch(statsUrl),
        fetch(lettersUrl)
      ]);
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(typeof s.totalLetters === 'number' ? s : null);
      } else setStats(null);
      if (lettersRes.ok) {
        const l = await lettersRes.json();
        let letters = Array.isArray(l.letters) ? l.letters : [];
        // fallback filter client-side jika API belum dukung query created_by
        if (!isAdmin() && user?.id) {
          letters = letters.filter((item: PermissionLetter) => item.created_by === user.id);
        }
        setRecentLetters(letters);
      } else setRecentLetters([]);
    } catch {
      setStats(null);
      setRecentLetters([]);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, [user, user?.id]); // tambahkan user dependency

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, fetchDashboardData]);

  const derived = useMemo<DashboardStats>(() => {
    if (!stats) {
      const total = recentLetters.length;
      const pending = recentLetters.filter(l => l.status === 'pending').length;
      const approved = recentLetters.filter(l => l.status === 'approved').length;
      const rejected = recentLetters.filter(l => l.status === 'rejected').length;
      return { totalLetters: total, pendingLetters: pending, approvedLetters: approved, rejectedLetters: rejected, totalUsers: 0 };
    }
    return stats;
  }, [stats, recentLetters]);

  const trendContext = useMemo(() => {
    if (derived.previous) {
      return {
        current: {
          totalLetters: derived.totalLetters,
          pendingLetters: derived.pendingLetters,
          approvedLetters: derived.approvedLetters,
          rejectedLetters: derived.rejectedLetters
        },
        previous: derived.previous
      };
    }
    const now = Date.now();
    const DAY = 86400000;
    const last7 = recentLetters.filter(l => now - new Date(l.created_at).getTime() < 7 * DAY);
    const prev7 = recentLetters.filter(l => {
      const diff = now - new Date(l.created_at).getTime();
      return diff >= 7 * DAY && diff < 14 * DAY;
    });
    const count = (arr: PermissionLetter[], s: string) => arr.filter(l => l.status === s).length;
    return {
      current: {
        totalLetters: last7.length || derived.totalLetters,
        pendingLetters: count(last7, 'pending') || derived.pendingLetters,
        approvedLetters: count(last7, 'approved') || derived.approvedLetters,
        rejectedLetters: count(last7, 'rejected') || derived.rejectedLetters
      },
      previous: {
        totalLetters: prev7.length,
        pendingLetters: count(prev7, 'pending'),
        approvedLetters: count(prev7, 'approved'),
        rejectedLetters: count(prev7, 'rejected')
      }
    };
  }, [derived, recentLetters]);

  const computeTrend = (cur: number, prev?: number) => {
    if (prev === undefined || prev === null) return null;
    if (prev === 0 && cur === 0) return 0;
    if (prev === 0) return 100;
    return ((cur - prev) / prev) * 100;
  };

  const trendData = useMemo(() => ({
    total: computeTrend(trendContext.current.totalLetters, trendContext.previous.totalLetters),
    pending: computeTrend(trendContext.current.pendingLetters, trendContext.previous.pendingLetters),
    approved: computeTrend(trendContext.current.approvedLetters, trendContext.previous.approvedLetters),
    rejected: computeTrend(trendContext.current.rejectedLetters, trendContext.previous.rejectedLetters)
  }), [trendContext]);

  const statusDistribution = useMemo(() => {
    const counts: Record<StatusKey, number> = { approved: 0, pending: 0, rejected: 0, draft: 0 };
    recentLetters.forEach(l => {
      const s = l.status as StatusKey;
      if (counts[s] !== undefined) counts[s] += 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return { counts, total };
  }, [recentLetters]);

  const filteredRecent = useMemo(
    () =>
      statusFilter === 'all'
        ? recentLetters
        : recentLetters.filter(l => l.status === statusFilter),
    [recentLetters, statusFilter]
  );
  const recentFour = filteredRecent.slice(0, 4);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  if (authLoading || (loadingData && !stats && recentLetters.length === 0)) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-7 w-44 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-80 rounded lg:col-span-2" />
            <Skeleton className="h-80 rounded" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
            <p className={`text-sm ${TOKENS.textMuted}`}>Halo, {user.name}. Ringkasan singkat sistem.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="flat"
              color="default"
              startContent={<IconRefresh className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
              onPress={handleRefresh}
              isDisabled={refreshing}
            >
              Refresh
            </Button>
            <Button
              as={Link}
              href="/letters/permissions/create"
              color="primary"
              startContent={<IconPlus className="h-4 w-4" />}
            >
              Buat Surat
            </Button>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Total Surat" value={trendContext.current.totalLetters} trend={trendData.total} icon={<IconFileText className="h-5 w-5 text-gray-500" />} />
          <StatCard title="Menunggu" value={trendContext.current.pendingLetters} trend={trendData.pending} icon={<IconClock className="h-5 w-5 text-gray-500" />} />
          <StatCard title="Disetujui" value={trendContext.current.approvedLetters} trend={trendData.approved} icon={<IconFileText className="h-5 w-5 text-gray-500" />} />
          <StatCard title="Ditolak" value={trendContext.current.rejectedLetters} trend={trendData.rejected} icon={<IconFileText className="h-5 w-5 text-gray-500" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Letters */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Surat Terbaru</h3>
                <p className={`text-xs ${TOKENS.textMuted}`}>4 entri terbaru</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'approved', 'rejected', 'draft'] as const).map(s => (
                  <Chip
                    key={s}
                    size="sm"
                    variant={statusFilter === s ? 'solid' : 'bordered'}
                    color={s === 'all' ? 'default' : statusColor(s)}
                    onClick={() => setStatusFilter(s)}
                    className="cursor-pointer"
                  >
                    {s === 'all' ? 'Semua' : statusLabel(s)}
                  </Chip>
                ))}
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-3">
              {filteredRecent.length === 0 && (
                <div className="py-12 text-center">
                  <IconFileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className={`text-sm ${TOKENS.textMuted}`}>Tidak ada data</p>
                </div>
              )}
              {recentFour.map(letter => (
                <div
                  key={letter.id}
                  className={`relative ${TOKENS.radius} p-4 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900
                  hover:shadow-md transition-shadow`}
                >
                  <div className="flex justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{letter.letter_number}</h4>
                        <Chip size="sm" color={statusColor(letter.status)} variant="flat">
                          {statusLabel(letter.status)}
                        </Chip>
                        <Chip size="sm" variant="bordered">
                          {typeLabel(letter.letter_type)}
                        </Chip>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-600 dark:text-gray-400">
                        <InfoIcon icon={<IconFileText className="h-3.5 w-3.5" />} text={letter.activity} />
                        <InfoIcon icon={<IconMapPin className="h-3.5 w-3.5" />} text={letter.location} />
                        <InfoIcon icon={<IconCalendar className="h-3.5 w-3.5" />} text={formatDate(letter.date)} />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        <IconUsers className="h-3.5 w-3.5" />
                        <span>{letter.participants?.length || 0} peserta</span>
                        <span className="mx-1">•</span>
                        <span>{formatDate(letter.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Tooltip content="Detail" size="sm">
                        <Button
                          as={Link}
                          href={`/letters/permissions/${letter.id}`}
                          size="sm"
                          isIconOnly
                          variant="flat"
                          color="default"
                          className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200"
                        >
                          <IconEye className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      {isAdmin() && (
                        <Tooltip content="Edit" size="sm">
                          <Button
                            as={Link}
                            href={`/letters/permissions/${letter.id}/edit`}
                            size="sm"
                            isIconOnly
                            variant="flat"
                            color="default"
                            className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-200"
                          >
                            <IconEdit className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/letters/permissions/${letter.id}`}
                    className="absolute inset-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800 dark:focus-visible:ring-neutral-200"
                    aria-label="Buka detail"
                  />
                </div>
              ))}
              <div className="pt-1">
                <Button
                  as={Link}
                  href="/letters/permissions"
                  variant="light"
                  endContent={<IconChevronRight className="h-4 w-4" />}
                  size="sm"
                >
                  Lihat Semua
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            <SimpleCard title="Distribusi Status">
              <div className="space-y-3">
                {(['approved', 'pending', 'rejected', 'draft'] as StatusKey[]).map(st => {
                  const value = statusDistribution.counts[st];
                  const pct = (value / statusDistribution.total) * 100;
                  return (
                    <div key={st} className="space-y-1">
                      <div className="flex justify-between text-[11px] text-gray-600 dark:text-gray-400">
                        <span>{statusLabel(st)}</span>
                        <span>{value} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                        <div className="h-full bg-gray-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SimpleCard>

            <SimpleCard title="Progress Bulanan">
              <div className="space-y-3">
                <ProgressLine label="Selesai" current={derived.approvedLetters} total={derived.totalLetters} />
                <ProgressLine label="Menunggu" current={derived.pendingLetters} total={derived.totalLetters} />
                <ProgressLine label="Ditolak" current={derived.rejectedLetters} total={derived.totalLetters} />
              </div>
            </SimpleCard>

            <SimpleCard title="Informasi Sistem">
              <div className="space-y-2">
                <InfoRow label="Total Pengguna" value={(derived.totalUsers ?? 0).toString()} />
                <InfoRow label="Created by" value="pierre" />
                <InfoRow label="Update" value={new Date().toLocaleDateString('id-ID')} />
              </div>
            </SimpleCard>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* Reusable */
function StatCard({ title, value, icon, trend }: { title: string; value: number; icon: React.ReactNode; trend: number | null }) {
  const positive = (trend ?? 0) > 0;
  const negative = (trend ?? 0) < 0;
  return (
    <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
      <CardBody className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{title}</span>
          <div className="p-2 rounded bg-gray-100 dark:bg-gray-800">{icon}</div>
        </div>
        <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
        {trend !== null && (
          <div className="flex items-center gap-1 text-[11px]">
            {trend === 0 && <span className="text-gray-500">0%</span>}
            {positive && (
              <>
                <IconArrowUpRight className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">+{Math.abs(trend).toFixed(1)}%</span>
              </>
            )}
            {negative && (
              <>
                <IconArrowDownRight className="h-4 w-4 text-red-600" />
                <span className="text-red-600 font-medium">-{Math.abs(trend).toFixed(1)}%</span>
              </>
            )}
            <span className="text-gray-500">vs prev</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function SimpleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="py-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </CardHeader>
      <Divider />
      <CardBody className="space-y-2">{children}</CardBody>
    </Card>
  );
}

function ProgressLine({ label, current, total }: { label: string; current: number; total: number }) {
  const pct = total ? (current / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-gray-600 dark:text-gray-400">
        <span>{label}</span>
        <span>{current}/{total || 0}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
        <div className="h-full bg-gray-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

function InfoIcon({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1 truncate">
      {icon}
      <span className="truncate">{text || '-'}</span>
    </div>
  );
}