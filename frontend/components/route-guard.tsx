"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

type RouteGuardProps = {
  children: React.ReactNode;
  requireAdmin?: boolean;
};

export function RouteGuard({ children, requireAdmin = false }: RouteGuardProps) {
  const router = useRouter();
  const { ready, user } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requireAdmin && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [ready, requireAdmin, router, user]);

  if (!ready || !user || (requireAdmin && user.role !== "ADMIN")) {
    return (
      <div className="shell section">
        <div className="empty-state">Checking your session...</div>
      </div>
    );
  }

  return <>{children}</>;
}
