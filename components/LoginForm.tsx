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
      // Redirect ke dashboard setelah login berhasil
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-3 items-center pb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Selamat Datang</h1>
            <p className="text-small text-default-500">Sistem Surat Menyurat Sekolah</p>
          </div>
        </CardHeader>
        
        <Divider />
        
        <CardBody className="gap-4">
          {errors.general && (
            <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-danger-600 text-sm">
              {errors.general}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              label="Email"
              placeholder="admin@sekolah.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isInvalid={!!errors.email}
              errorMessage={errors.email}
              startContent={
                <div className="pointer-events-none flex items-center">
                  <span className="text-default-400 text-small">@</span>
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
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                  ) : (
                    <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                  )}
                </button>
              }
              type={showPassword ? "text" : "password"}
            />
            
            <Button
              type="submit"
              color="primary"
              size="lg"
              isLoading={loading}
              className="w-full"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}