import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-bg-primary">
      <div className="w-full max-w-sm bg-bg-secondary border border-border-default p-6">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-text-primary tracking-tight">
            Coinbook
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Perpetual Futures
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
