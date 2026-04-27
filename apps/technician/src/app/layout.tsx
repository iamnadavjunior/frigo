import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ServiceWorkerRegistration } from "@/components/sw-registration";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "CABU Technician",
  description: "Technician job management",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Tech App" },
};

export const viewport: Viewport = {
  themeColor: "#14b8a6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#F8F9FC] dark:bg-[#0a0a0a] text-gray-900 antialiased">
        <AuthProvider>
          <ServiceWorkerRegistration />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
