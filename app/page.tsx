'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
import { DocumentVerificationModal } from '@/components/DocumentVerificationModal';
import { useDisclosure } from '@heroui/modal';

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
  IconArrowDownRight,
  IconShieldCheck,
  IconArrowUp,
  IconArrowDown,
  IconMinus,
  IconBell,
  IconBellOff
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
  const [totalDrafts, setTotalDrafts] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusKey | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Tambahkan state dan refs untuk notifikasi
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const previousLetterCount = useRef<number>(0);
  const isInitialLoad = useRef(true);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // State untuk menyimpan hasil validasi surat
  const [verifiedLetterId, setVerifiedLetterId] = useState<string | null>(null);
  // About/Help modal (cara penggunaan)
  const { isOpen: isAboutOpen, onOpen: onAboutOpen, onClose: onAboutClose } = useDisclosure();

  const isAdmin = () => user?.role === 'admin';

  // Utility functions untuk notifikasi
  const requestNotificationPermission = async (): Promise<boolean> => {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('Browser tidak mendukung notifikasi');
      return false;
    }

    // Check current permission
    if (Notification.permission === 'granted') {
      console.log('Notifikasi sudah diizinkan');
      return true;
    }
    
    if (Notification.permission === 'denied') {
      console.log('Notifikasi ditolak oleh user');
      alert('Notifikasi telah diblokir. Silakan aktifkan di pengaturan browser.');
      return false;
    }

    try {
      // Request permission - harus dari user interaction
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      
      if (permission === 'granted') {
        console.log('Notifikasi berhasil diaktifkan');
        return true;
      } else {
        console.log('Notifikasi ditolak');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    console.log('Attempting to show notification:', title);
    
    if (!('Notification' in window)) {
      console.log('Fallback: Browser tidak mendukung notifikasi');
      // Fallback untuk browser yang tidak mendukung
      alert(`${title}\n${options?.body || ''}`);
      return null;
    }

    if (Notification.permission !== 'granted') {
      console.log('Fallback: Permission tidak granted');
      // Fallback jika permission tidak ada
      alert(`${title}\n${options?.body || ''}`);
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'surat-baru',
        renotify: true,
        requireInteraction: false, // Ubah ke false untuk mobile
        silent: false,
        ...options
      });

      // Event listeners
      notification.onclick = () => {
        console.log('Notification clicked');
        window.focus();
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
        notification.close();
      };

      notification.onerror = (error) => {
        console.error('Notification error:', error);
      };

      // Auto close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      console.log('Notification created successfully');
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      // Fallback jika gagal membuat notifikasi
      alert(`${title}\n${options?.body || ''}`);
      return null;
    }
  };

  // Initialize notifications untuk admin
  useEffect(() => {
    const initNotifications = async () => {
      if (isAdmin()) {
        const granted = await requestNotificationPermission();
        setNotificationsEnabled(granted);
      }
    };

    if (user && !authLoading) {
      initNotifications();
    }
  }, [user, authLoading]);

  const fetchDashboardData = useCallback(async (showNotif = false) => {
    try {
      setLoadingData(true);
      const statsUrl = isAdmin()
        ? '/api/dashboard/stats?withPrevious=1'
        : `/api/dashboard/stats?withPrevious=1&created_by=${user?.id}`;
      const lettersUrl = isAdmin()
        ? '/api/permission-letters?limit=50'
        : `/api/permission-letters?limit=50&created_by=${user?.id}`;
      const draftCountUrl = isAdmin()
        ? '/api/permission-letters?status=draft&page=1&pageSize=1'
        : `/api/permission-letters?status=draft&page=1&pageSize=1&created_by=${user?.id}`;
      const [statsRes, lettersRes, draftsRes] = await Promise.all([
        fetch(statsUrl),
        fetch(lettersUrl),
        fetch(draftCountUrl)
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

        // Check for new letters (hanya untuk admin)
        if (isAdmin() && !isInitialLoad.current && showNotif && notificationsEnabled) {
          const currentCount = letters.filter(l => l.status === 'pending').length;
          const newLettersCount = currentCount - previousLetterCount.current;
          
          if (newLettersCount > 0) {
            const latestLetter = letters
              .filter(l => l.status === 'pending')
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            
            if (latestLetter) {
              showNotification(
                `${newLettersCount} Surat Baru Menunggu Persetujuan`,
                {
                  body: `${latestLetter.letter_number} - ${latestLetter.activity}`,
                  data: { letterId: latestLetter.id, url: `/letters/permissions/${latestLetter.id}` }
                }
              );
            }
          }
          
          previousLetterCount.current = currentCount;
        } else if (isAdmin() && isInitialLoad.current) {
          previousLetterCount.current = letters.filter(l => l.status === 'pending').length;
          isInitialLoad.current = false;
        }

        setRecentLetters(letters);
      } else setRecentLetters([]);
      // Fetch draft total count
      if (draftsRes.ok) {
        const d = await draftsRes.json();
        if (typeof d.total === 'number') setTotalDrafts(d.total);
      }
    } catch {
      setStats(null);
      setRecentLetters([]);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, [user, notificationsEnabled]); // tambahkan user dependency

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, fetchDashboardData]);

  // Auto-refresh setiap 30 detik untuk admin
  useEffect(() => {
    if (isAdmin() && notificationsEnabled && !authLoading) {
      pollInterval.current = setInterval(() => {
        fetchDashboardData(true);
      }, 30000);

      return () => {
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
        }
      };
    }
  }, [isAdmin, notificationsEnabled, authLoading, fetchDashboardData]);

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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRecent.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredRecent.length / itemsPerPage);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  const { isOpen: isVerifyOpen, onOpen: onVerifyOpen, onClose: onVerifyClose } = useDisclosure();

  // Function untuk toggle notifikasi
  const toggleNotifications = async () => {
    console.log('Toggle notifications clicked');
    
    if (!notificationsEnabled) {
      console.log('Requesting notification permission...');
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
      
      if (granted) {
        console.log('Testing notification...');
        // Test notification
        showNotification('Notifikasi Diaktifkan ✅', {
          body: 'Anda akan menerima notifikasi untuk surat baru',
          icon: '/favicon.ico'
        });
      } else {
        alert('Gagal mengaktifkan notifikasi. Pastikan Anda mengizinkan notifikasi di browser.');
      }
    } else {
      console.log('Disabling notifications...');
      setNotificationsEnabled(false);
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
      alert('Notifikasi dinonaktifkan');
    }
  };

  // Handler ketika verifikasi dokumen sukses
  const handleVerificationSuccess = useCallback((result: { letterId: string }) => {
    setVerifiedLetterId(result.letterId);
  }, []);

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Selamat datang, {user?.name}
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin() && (
              <Button
                variant="flat"
                color={notificationsEnabled ? "success" : "default"}
                startContent={notificationsEnabled ? <IconBell className="h-4 w-4" /> : <IconBellOff className="h-4 w-4" />}
                onPress={toggleNotifications}
                size="sm"
              >
                {notificationsEnabled ? 'Notifikasi ON' : 'Notifikasi OFF'}
              </Button>
            )}
            <Button
              variant="flat"
              color="secondary"
              startContent={<IconShieldCheck className="h-4 w-4" />}
              onPress={onVerifyOpen}
            >
              Verifikasi Dokumen
            </Button>
            <Button
              variant="light"
              startContent={<IconRefresh className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
              onPress={handleRefresh}
              isDisabled={refreshing}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard title="Total Surat" value={trendContext.current.totalLetters} trend={trendData.total} icon={<IconFileText className="h-5 w-5 text-gray-500" />} />
          <StatCard title="Menunggu" value={trendContext.current.pendingLetters} trend={trendData.pending} icon={<IconClock className="h-5 w-5 text-gray-500" />} />
          <StatCard title="Disetujui" value={trendContext.current.approvedLetters} trend={trendData.approved} icon={<IconFileText className="h-5 w-5 text-gray-500" />} />
          <StatCard title="Ditolak" value={trendContext.current.rejectedLetters} trend={trendData.rejected} icon={<IconFileText className="h-5 w-5 text-gray-500" />} />
          <StatCard title="Draft" value={totalDrafts} trend={null} icon={<IconFileText className="h-5 w-5 text-gray-500" />} />
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
                {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
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
              {currentItems.length === 0 && (
                <div className="py-12 text-center">
                  <IconFileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className={`text-sm ${TOKENS.textMuted}`}>Tidak ada data</p>
                </div>
              )}
              {currentItems.map(letter => (
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
              <div className="pt-1 flex justify-between">
                <Button
                  variant="light"
                  size="sm"
                  isDisabled={currentPage === 1}
                  onPress={() => setCurrentPage(currentPage - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="light"
                  size="sm"
                  isDisabled={currentPage === totalPages}
                  onPress={() => setCurrentPage(currentPage + 1)}
                >
                  Selanjutnya
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
                <InfoRow label="Dibuat oleh" value="pierre" />
                <div className="pt-1 text-[11px] text-gray-600 dark:text-gray-400">
                  <div>Fungsi: Kelola pengajuan surat, persetujuan, dan unduhan PDF.</div>
                  <div>Cara pakai: Ajukan → Tinjau → Setujui/Tolak → Cetak.</div>
                </div>
                <div className="pt-2">
                  <Button size="sm" variant="flat" onPress={onAboutOpen} className="w-full">
                    Baca selengkapnya
                  </Button>
                </div>
              </div>
            </SimpleCard>
          </div>
        </div>
      </div>

      {/* Document Verification Modal */}
      <DocumentVerificationModal
        isOpen={isVerifyOpen}
        onClose={onVerifyClose}
        onSuccess={handleVerificationSuccess}
      />
      {/* About / Cara Penggunaan Modal */}
      {isAboutOpen && (
        <div role="dialog" aria-modal="true">
          {/* Using HeroUI Modal for consistency */}
        </div>
      )}
      <AboutModal isOpen={isAboutOpen} onClose={onAboutClose} />
      {/* Tombol redirect ke detail surat jika validasi sukses */}
      {verifiedLetterId && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <a
            href={`/letters/permissions/${verifiedLetterId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Button
              color="success"
              variant="solid"
              startContent={<IconEye className="h-4 w-4" />}
              size="lg"
              className="shadow-lg"
            >
              Lihat Detail Surat
            </Button>
          </a>
        </div>
      )}
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

// Modal konten cara penggunaan + fungsi
function AboutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-w-lg w-[90%] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Panduan Penggunaan</h3>
        </div>
        <div className="p-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <div className="font-semibold mb-1">Fungsi Utama</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Pengajuan surat izin/keterangan/kegiatan oleh pengguna.</li>
              <li>Review dan persetujuan/penolakan surat oleh admin.</li>
              <li>Unduh surat sebagai PDF setelah disetujui.</li>
              <li>Pantau status surat secara realtime.</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-1">Langkah Penggunaan</div>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Masuk ke sistem dan buka menu "Pengajuan Surat".</li>
              <li>Klik "Buat Baru", isi data kegiatan/lokasi/waktu/peserta.</li>
              <li>Kirim pengajuan; admin akan meninjau.</li>
              <li>Admin: buka daftar, pilih surat, lalu Setujui/Tolak.</li>
              <li>Jika disetujui, unduh PDF atau bagikan sesuai kebutuhan.</li>
            </ol>
          </div>
          <div>
            <div className="font-semibold mb-1">Tips</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gunakan kolom pencarian dan filter jenis untuk mempercepat.</li>
              <li>Nyalakan notifikasi browser agar update terlihat segera.</li>
            </ul>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <Button size="sm" onPress={onClose} variant="flat">Tutup</Button>
        </div>
      </div>
    </div>
  );
}
