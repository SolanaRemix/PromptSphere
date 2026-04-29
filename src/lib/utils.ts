/**
 * Default affiliate commission rate (10%).
 * Used when creating a new affiliate record or calculating commissions
 * before the affiliate's specific rate is fetched.
 */
export const DEFAULT_COMMISSION_RATE = 0.1;

/**
 * Formats a Date value (or any value that can be coerced to a Date)
 * as a localised date string.
 */
export function formatDate(date: Date | unknown): string {
  if (date instanceof Date) return date.toLocaleDateString();
  return new Date(date as string | number).toLocaleDateString();
}

/**
 * Formats a Date value as a localised date-time string.
 */
export function formatDateTime(date: Date | unknown): string {
  if (date instanceof Date) return date.toLocaleString();
  return new Date(date as string | number).toLocaleString();
}
