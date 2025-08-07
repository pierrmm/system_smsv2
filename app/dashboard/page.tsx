"use client";

import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { 
  IconFileText, 
  IconMail, 
  IconSend, 
  IconArchive,
  IconUsers,
  IconPlus,
  IconTrendingUp,
  IconClock
} from "@tabler/icons-react";
import Link from "next/link";

export default function DashboardPage() {
  const stats = [
    {
      title: "Total Surat",
      value: "156",
      change: "+12%",
      icon: IconFileText,
    },
    {
      title: "Surat Masuk",
      value: "89",
      change: "+8%",
      icon: IconMail,
    },
    {
      title: "Surat Keluar",
      value: "67",
      change: "+4%",
      icon: IconSend,
    },
    {
      title: "Arsip",
      value: "24",
      change: "+2%",
      icon: IconArchive,
    },
  ];

  const recentActivities = [
    {
      id: 1,
      title: "Surat Undangan Rapat Koordinasi",
      subtitle: "Dari: Dinas Pendidikan",
      time: "2 jam yang lalu",
      status: "Baru",
      type: "incoming"
    },
    {
      id: 2,
      title: "Surat Permohonan Izin Kegiatan",
      subtitle: "Dari: SMAN 1 Jakarta",
      time: "4 jam yang lalu",
      status: "Terkirim",
      type: "outgoing"
    },
    {
      id: 3,
      title: "Surat Pemberitahuan Libur Nasional",
      subtitle: "Dari: Kemendikbud",
      time: "1 hari yang lalu",
      status: "Draft",
      type: "outgoing"
    },
    {
      id: 4,
      title: "Surat Balasan Kerjasama",
      subtitle: "Dari: Universitas Indonesia",
      time: "2 hari yang lalu",
      status: "Diproses",
      type: "incoming"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Selamat datang di Sistem Informasi Surat Menyurat
        </p>
      </div>

      {/* Stats Grid dengan Card HeroUI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-gray-800 border-gray-700">
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-white mt-2">
                      {stat.value}
                    </p>
                    <div className="flex items-center mt-2">
                      <IconTrendingUp className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-xs text-gray-400">
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-700">
                    <Icon className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities dengan Card HeroUI */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Aktivitas Terbaru
            </h3>
            <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full">
              4 surat
            </span>
          </CardHeader>
          <Divider className="bg-gray-700" />
          <CardBody>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg bg-gray-700/50">
                  <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                    {activity.type === 'incoming' ? (
                      <IconMail className="h-5 w-5 text-gray-300" />
                    ) : (
                      <IconSend className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activity.subtitle}
                        </p>
                        <div className="flex items-center mt-2">
                          <IconClock className="h-3 w-3 text-gray-400 mr-1" />
                          <span className="text-xs text-gray-400">
                            {activity.time}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs bg-gray-600 text-gray-200 rounded-full">
                        {activity.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          {/* Monthly Statistics */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">
                Statistik Bulanan
              </h3>
            </CardHeader>
            <Divider className="bg-gray-700" />
            <CardBody>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-300">
                      Surat Masuk
                    </span>
                    <span className="text-sm font-semibold text-white">
                      89/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full" style={{width: '89%'}}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-300">
                      Surat Keluar
                    </span>
                    <span className="text-sm font-semibold text-white">
                      67/80
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full" style={{width: '84%'}}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-300">
                      Surat Diproses
                    </span>
                    <span className="text-sm font-semibold text-white">
                      142/156
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full" style={{width: '91%'}}></div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">
                Tindakan Cepat
              </h3>
            </CardHeader>
            <Divider className="bg-gray-700" />
            <CardBody>
              <div className="space-y-3">
                <Link href="/letters/incoming/create">
                  <Button 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-gray-200"
                    variant="flat"
                    startContent={<IconPlus className="h-4 w-4" />}
                  >
                    Buat Surat Masuk
                  </Button>
                </Link>
                
                <Link href="/letters/outgoing/create">
                  <Button 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-gray-200"
                    variant="flat"
                    startContent={<IconSend className="h-4 w-4" />}
                  >
                    Buat Surat Keluar
                  </Button>
                </Link>
                
                <Link href="/letters/archive">
                  <Button 
                    className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-gray-200"
                    variant="flat"
                    startContent={<IconArchive className="h-4 w-4" />}
                  >
                    Lihat Arsip
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}