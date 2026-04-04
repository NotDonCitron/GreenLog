"use client";

import { AuthProvider } from "@/components/auth-provider";
import { QueryProvider } from "./query-provider";
import { ToastProvider } from "@/components/toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
