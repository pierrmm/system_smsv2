
import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import clsx from "clsx";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistem SMS Pesat",
  description: "Sistem Manajemen Surat Pesat",
  icons: {
    icon: "/images/pesat1.png",
    shortcut: "/images/pesat1.png",
    apple: "/images/pesat1.png",
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
    <html lang="id">
      <head>
        <link rel="icon" href="/images/pesat1.png" />
        <link rel="shortcut icon" href="/images/pesat1.png" />
        <link rel="apple-touch-icon" href="/images/pesat1.png" />
      </head>
      <body
        className={clsx(
          inter.className,
          "min-h-dvh bg-background font-sans antialiased overflow-y-auto touch-pan-y",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
