export function formatPrice(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "--";
  if (value >= 1000) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return value.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
}

export function formatSize(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "--";
  if (value >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function formatUSD(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "--";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
