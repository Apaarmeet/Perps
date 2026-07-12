"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { MarketProvider } from "@/context/MarketContext";
import { TopBar } from "@/components/layout/TopBar";
import { Spinner } from "@/components/ui/Spinner";

function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    }>
      <MarketProvider>
        <div className="flex flex-col h-full">
          <TopBar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </MarketProvider>
    </Suspense>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
