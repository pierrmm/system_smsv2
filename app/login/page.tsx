"use client";
import { LoginForm } from "@/components/LoginForm";
import { ThemeSwitch } from "@/components/theme-switch";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-4 z-30">
        <ThemeSwitch />
      </div>
      <LoginForm />
    </div>
  );
}



