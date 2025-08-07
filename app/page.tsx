'use client';

import { Divider } from "@heroui/divider";
import { 
  IconFileText, 
  IconMail, 
  IconSend, 
  IconArchive,
  IconUsers,
  IconPlus,
  IconTrendingUp,
  IconClock,
  IconEye,
  IconEdit,
  IconCalendar,
  IconMapPin
} from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@heroui/spinner";

interface DashboardStats {
  totalLetters: number;
  incomingLetters: number;
  outgoingLetters: number;
  archivedLetters: number;
  pendingLetters: number;
  approvedLetters: number;
  rejectedLetters: number;
  totalUsers: number;
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
  participants: Array<{
    id: string;
    name: string;
    class: string;
  }>;
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLetters, setRecentLetters] = useState<PermissionLetter[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch stats
      const statsResponse = await fetch('/api/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch recent letters
      const lettersResponse = await fetch('/api/permission-letters?limit=5');
      if (lettersResponse.ok) {
        const lettersData = await lettersResponse.json();
        setRecentLetters(lettersData.letters || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const isAdmin = () => user?.role === 'admin';

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

  if (loading || loadingData) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-96">
          <div className="text-center">
            <Spinner size="lg" color="primary" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Memuat dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Sistem Surat
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Selamat datang, {user.name}! Kelola surat menyurat dengan mudah dan efisien.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Total Surat
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats?.totalLetters || 0}
                  </p>
                  <div className="flex items-center mt-3">
                    <IconTrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-500 font-medium">
                      +12% bulan ini
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/10">
                  <IconFileText className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Menunggu Persetujuan
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats?.pendingLetters || 0}
                  </p>
                  <div className="flex items-center mt-3">
                    <IconClock className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-sm text-yellow-500 font-medium">
                      Perlu tindakan
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-yellow-500/10">
                  <IconClock className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Disetujui
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats?.approvedLetters || 0}
                  </p>
                  <div className="flex items-center mt-3">
                    <IconTrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-500 font-medium">
                      +8% bulan ini
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-green-500/10">
                  <IconSend className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Arsip
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats?.archivedLetters || 0}
                  </p>
                  <div className="flex items-center mt-3">
                    <IconArchive className="h-4 w-4 text-gray-500 mr-1" />
                    <span className="text-sm text-gray-500 font-medium">
                      Tersimpan
                    </span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gray-500/10">
                  <IconArchive className="h-8 w-8 text-gray-500" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Letters - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Surat Terbaru
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    Daftar surat yang baru dibuat atau diperbarui
                  </p>
                </div>
                <Link href="/letters/permissions">
                  <Button color="primary" variant="flat" size="sm">
                    Lihat Semua
                  </Button>
                </Link>
              </CardHeader>
              <CardBody>
                {recentLetters.length === 0 ? (
                  <div className="text-center py-12">
                    <IconFileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Belum ada surat
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Mulai dengan membuat surat izin pertama Anda
                    </p>
                    <Link href="/letters/permissions/create">
                      <Button 
                        color="primary"
                        startContent={<IconPlus className="h-4 w-4" />}
                      >
                                               Buat Surat
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentLetters.map((letter) => (
                      <div key={letter.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {letter.letter_number}
                              </h4>
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
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3">
                              <div className="flex items-center gap-2">
                                <IconFileText className="h-4 w-4" />
                                <span>{letter.activity}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <IconMapPin className="h-4 w-4" />
                                <span>{letter.location}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <IconCalendar className="h-4 w-4" />
                                <span>{formatDate(letter.date)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <IconUsers className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {letter.participants.length} peserta
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Link href={`/letters/permissions/${letter.id}`}>
                              <Button
                                size="sm"
                                variant="flat"
                                color="primary"
                                isIconOnly
                              >
                                <IconEye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/letters/permissions/${letter.id}/edit`}>
                              <Button
                                size="sm"
                                variant="flat"
                                color="warning"
                                isIconOnly
                              >
                                <IconEdit className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Sidebar - Takes 1 column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tindakan Cepat
                </h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <Link href="/letters/permissions/create" className="block">
                  <Button 
                    className="w-full justify-start" 
                    variant="flat"
                    startContent={<IconPlus className="h-4 w-4" />}
                  >
                    Buat Surat Izin
                  </Button>
                </Link>
                <Link href="/letters/permissions" className="block">
                  <Button 
                    className="w-full justify-start" 
                    variant="flat"
                    startContent={<IconFileText className="h-4 w-4" />}
                  >
                    Kelola Surat
                  </Button>
                </Link>
              </CardBody>
            </Card>

            {/* Progress Bulanan */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Progress Bulanan
                </h3>
              </CardHeader>
              <CardBody className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Surat Diproses
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {stats?.approvedLetters || 0}/{(stats?.totalLetters || 0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{
                        width: `${stats?.totalLetters ? (stats.approvedLetters / stats.totalLetters) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Menunggu Approval
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {stats?.pendingLetters || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                      style={{
                        width: `${stats?.totalLetters ? (stats.pendingLetters / stats.totalLetters) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Ditolak
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {stats?.rejectedLetters || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                      style={{
                        width: `${stats?.totalLetters ? (stats.rejectedLetters / stats.totalLetters) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* System Info */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Informasi Sistem
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Pengguna</span>
                  <span className="text-sm text-gray-900 dark:text-white font-medium">
                    {stats?.totalUsers || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Update Terakhir</span>
                  <span className="text-sm text-gray-900 dark:text-white font-medium">
                    {new Date().toLocaleDateString('id-ID')}
                  </span>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}