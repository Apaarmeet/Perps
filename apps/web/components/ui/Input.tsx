"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, suffix, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm text-text-secondary font-medium">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`w-full bg-bg-input border border-border-default text-text-primary text-sm px-3 py-2.5 rounded-sm outline-none transition-colors placeholder:text-text-muted focus:border-border-accent disabled:opacity-50 font-mono ${suffix ? "pr-10" : ""} ${className}`}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted font-mono">
              {suffix}
            </span>
          )}
        </div>
        {error && (
          <span className="text-sm text-red">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
