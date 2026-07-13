"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

let nextId = 0;
let externalApi: ToastApi = {
  success: () => {},
  error: () => {},
  info: () => {},
};

export const toast: ToastApi = {
  success: (msg) => externalApi.success(msg),
  error: (msg) => externalApi.error(msg),
  info: (msg) => externalApi.info(msg),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastItem["type"]) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const api = useCallback(() => ({
    success: (msg: string) => addToast(msg, "success"),
    error: (msg: string) => addToast(msg, "error"),
    info: (msg: string) => addToast(msg, "info"),
  }), [addToast]);

  const currentApi = api();

  useEffect(() => {
    externalApi = currentApi;
    return () => {
      externalApi = { success: () => {}, error: () => {}, info: () => {} };
    };
  }, [currentApi]);

  return (
    <ToastContext.Provider value={currentApi}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2.5 text-sm font-medium border shadow-lg pointer-events-auto animate-slide-up rounded-sm ${
              t.type === "success"
                ? "bg-green/10 border-green/30 text-green"
                : t.type === "error"
                  ? "bg-red/10 border-red/30 text-red"
                  : "bg-accent/10 border-accent/30 text-text-primary"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
