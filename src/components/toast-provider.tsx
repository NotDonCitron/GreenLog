"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  action?: ToastAction;
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error" | "info", action?: ToastAction) => void;
  success: (message: string, action?: ToastAction) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "info", action?: ToastAction) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toast: addToast,
        success: (m, action) => addToast(m, "success", action),
        error: (m) => addToast(m, "error"),
        info: (m) => addToast(m, "info"),
      }}
    >
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right fade-in ${
              t.type === "success"
                ? "bg-green-600 text-white"
                : t.type === "error"
                ? "bg-red-600 text-white"
                : "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]"
            }`}
            role="alert"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="truncate">{t.message}</span>
                {t.action && (
                  <button
                    onClick={() => { t.action?.onClick(); dismiss(t.id); }}
                    className="text-white/90 hover:text-white font-semibold whitespace-nowrap flex-shrink-0 underline underline-offset-2"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-2 opacity-60 hover:opacity-100 flex-shrink-0"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
