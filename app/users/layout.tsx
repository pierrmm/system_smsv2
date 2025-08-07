'use client';

import { Spinner } from "@heroui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { useEffect } from "react";

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}