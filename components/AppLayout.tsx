"use client";
import clsx from "clsx";
import React, { useState, useEffect, useRef } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { 
  IconDashboard, 
  IconFileText, 
  IconUsers, 
  IconSettings,
  IconLogout,
  IconMenu2,
  IconX,
  IconMail,
  IconSend,
  IconArchive,
  IconUser,
  IconArrowUp
} from "@tabler/icons-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { Divider } from "@heroui/divider";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const links = [
    {
      label: "Dashboard",
      href: "/",
      icon: (
        <IconDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Surat Izin",
      href: "/letters/permissions",
      icon: (
        <IconFileText className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    },
    // Only show Users menu for admin
    ...(isAdmin() ? [{
      label: "Pengguna",
      href: "/users",
      icon: (
        <IconUsers className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
    }] : []),
  ];

  useEffect(() => {
    const el = scrollRef.current;
    const threshold = 300;

    function getScrollable() {
      if (el && el.scrollHeight > el.clientHeight + 10) return el;
      return window;
    }

    const target: any = getScrollable();

    const handleScroll = () => {
      const pos =
        target === window
          ? window.scrollY || document.documentElement.scrollTop
          : target.scrollTop;
      setShowBackToTop(pos > threshold);
    };

    target.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => target.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 max-w-full mx-auto border border-neutral-200 dark:border-neutral-700 min-h-dvh supports-[min-height:100dvh]:min-h-[100dvh] md:h-screen overflow-x-hidden"
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Avatar
                size="sm"
                name={user?.name}
                className="bg-gray-600 dark:bg-gray-400"
              />
              {open && (
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    {user?.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {user?.email}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="light"
              color="danger"
              size="sm"
              startContent={<IconLogout className="h-4 w-4" />}
              className={cn("w-full justify-start", !open && "px-2")}
              onPress={handleLogout}
            >
              {open && "Keluar"}
            </Button>
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex flex-1 flex-col">
        <div
          ref={scrollRef}
          className="relative p-2 md:p-10 rounded-tl-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full h-full overflow-y-auto"
        >
          {children}
          {showBackToTop && (
            <button
              onClick={() => {
                const el = scrollRef.current;
                if (el && el.scrollHeight > el.clientHeight + 10) {
                  el.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              aria-label="Kembali ke atas"
              className="fixed bottom-5 right-4 md:bottom-8 md:right-8 z-40 rounded-full bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900 p-3 shadow-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
            >
              <IconArrowUp className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const Logo = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        SMS System
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-black dark:bg-white rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  );
};