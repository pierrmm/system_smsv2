"use client";
import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Input } from '@heroui/input';
import { Button } from '@heroui/button';
import { Divider } from '@heroui/divider';
import { EyeFilledIcon, EyeSlashFilledIcon } from '@heroui/shared-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const { signIn, loading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validasi client-side
    const newErrors: { [key: string]: string } = {};
    
    if (!email) newErrors.email = 'Email harus diisi';
    if (!password) newErrors.password = 'Password harus diisi';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    console.log('Submitting login form...');
    const result = await signIn(email, password);
    
    if (result.error) {
      console.log('Login error:', result.error);
      const { message, type } = result.error;
      if (type === 'email' || type === 'password') {
        setErrors({ [type]: message });
      } else {
        setErrors({ general: message });
      }
    } else {
      console.log('Login successful, redirecting...');
      // Redirect ke halaman utama setelah login berhasil
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Column - Information */}
        <div className="space-y-8 text-center lg:text-left">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              Sistem Pengajuan Surat Digital
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Kelola Pengajuan Surat dan administrasi sekolah dengan mudah dan efisien
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-black dark:bg-white rounded-lg flex items-center justify-center mx-auto lg:mx-0">
                <span className="text-white dark:text-black font-bold text-lg">📝</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Buat Pengajuan Surat
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Buat Pengajuan surat siswa dengan template yang tersedia. Proses cepat dan mudah untuk berbagai keperluan.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="w-12 h-12 bg-black dark:bg-white rounded-lg flex items-center justify-center mx-auto lg:mx-0">
                <span className="text-white dark:text-black font-bold text-lg">📋</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Kelola Administrasi
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Kelola semua dokumen administrasi sekolah dalam satu platform terintegrasi dan terorganisir.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="w-12 h-12 bg-black dark:bg-white rounded-lg flex items-center justify-center mx-auto lg:mx-0">
                <span className="text-white dark:text-black font-bold text-lg">⚡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Proses Cepat
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Sistem yang dirancang untuk mempercepat proses pembuatan dan persetujuan Pengajuan Surat .
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="w-12 h-12 bg-black dark:bg-white rounded-lg flex items-center justify-center mx-auto lg:mx-0">
                <span className="text-white dark:text-black font-bold text-lg">🔒</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Aman & Terpercaya
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Data siswa dan dokumen sekolah tersimpan dengan aman menggunakan teknologi enkripsi modern.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Login Form */}
        <div className="flex justify-center lg:justify-end">
          <Card className="w-full max-w-md shadow-lg border border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-col gap-4 items-center pb-6 pt-8">
              {/* Simple logo design */}
              <div className="w-16 h-16 bg-black dark:bg-white rounded-xl flex items-center justify-center">
                <span className="text-white dark:text-black font-bold text-2xl">S</span>
              </div>
              
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Selamat Datang
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Masuk ke sistem
                </p>
              </div>
            </CardHeader>
            
            <Divider className="bg-gray-200 dark:bg-gray-700" />
            
            <CardBody className="gap-4 px-8 py-6">
              {errors.general && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                  {errors.general}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  type="email"
                  label="Email"
                  placeholder="user@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  isInvalid={!!errors.email}
                  errorMessage={errors.email}
                  variant="bordered"
                  classNames={{
                    inputWrapper: "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }}
                  startContent={
                    <div className="pointer-events-none flex items-center">
                      <span className="text-gray-400 text-small">@</span>
                    </div>
                  }
                />
                
                <Input
                  label="Password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isInvalid={!!errors.password}
                  errorMessage={errors.password}
                  variant="bordered"
                  classNames={{
                    inputWrapper: "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }}
                  endContent={
                    <button
                      className="focus:outline-none"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashFilledIcon className="text-2xl text-gray-400" />
                      ) : (
                        <EyeFilledIcon className="text-2xl text-gray-400" />
                      )}
                    </button>
                  }
                  type={showPassword ? "text" : "password"}
                />
                
                <Button
                  type="submit"
                  size="lg"
                  isLoading={loading}
                  className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 font-medium"
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : 'Masuk'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}