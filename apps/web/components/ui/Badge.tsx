interface BadgeProps {
  label: string;
  variant: "green" | "red" | "neutral";
}

const variantStyles = {
  green: "text-green bg-green-muted",
  red: "text-red bg-red-muted",
  neutral: "text-text-secondary bg-bg-hover",
};

export function Badge({ label, variant }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-sm font-medium rounded-sm ${variantStyles[variant]}`}
    >
      {label}
    </span>
  );
}
