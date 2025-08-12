import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import clsx from "clsx";
import { AuthProvider } from "@/contexts/AuthContext";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Sistem Surat Menyurat Sekolah",
    template: `%s - Sistem Surat Menyurat Sekolah`,
  },
  description: "Sistem Informasi Surat Menyurat untuk Sekolah",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="id">
      <head />
      <body
        className={clsx(
          inter.className,
          "min-h-dvh bg-background font-sans antialiased overflow-y-auto touch-pan-y",
          fontSans.variable,
        )}
      >
        <AuthProvider>
          <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
            {children}
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}