"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

export default function CommunesPage() {
  useAuth();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((cities: { id: string }[]) => {
        if (cities.length > 0) {
          router.replace(`/communes/${cities[0].id}`);
        } else {
          router.replace("/dashboard");
        }
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10" />
        <div className="w-28 h-2 rounded bg-gray-200 dark:bg-white/10" />
      </div>
    </div>
  );
}