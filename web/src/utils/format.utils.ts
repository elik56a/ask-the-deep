export function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

// Six decimals: one answer costs fractions of a cent.
export function formatUsd(usd: number): string {
  return usd === 0 ? "$0" : `$${usd.toFixed(6)}`;
}

export function formatInt(value: number): string {
  return value.toLocaleString("en-US");
}
