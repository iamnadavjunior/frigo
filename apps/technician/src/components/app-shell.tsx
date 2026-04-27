"use client";
import { usePathname } from "next/navigation";
import { MobileLayout } from "@/components/mobile-layout";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;
  return <MobileLayout>{children}</MobileLayout>;
}
