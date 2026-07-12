"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover border-accent",
  danger:
    "bg-transparent text-red border-red/30 hover:bg-red-muted",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover border-transparent",
};

export function Button({
  variant = "primary",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-none border transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
