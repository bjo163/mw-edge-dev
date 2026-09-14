import type { Locale } from "./messages.js";

const localeTag: Readonly<Record<Locale, string>> = {
  en: "en-US",
  id: "id-ID",
};

export function formatNumber(value: number, locale: Locale, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(localeTag[locale], options).format(value);
}

export function formatMoney(
  value: number,
  currency: string,
  locale: Locale,
  options: Omit<Intl.NumberFormatOptions, "style" | "currency"> = {},
): string {
  return new Intl.NumberFormat(localeTag[locale], {
    ...options,
    style: "currency",
    currency,
  }).format(value);
}

export function formatPercent(value: number, locale: Locale, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(localeTag[locale], {
    maximumFractionDigits: 2,
    ...options,
    style: "percent",
  }).format(value);
}

export function formatDate(
  value: string | number | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(localeTag[locale], options).format(new Date(value));
}

export function formatDateTime(
  value: string | number | Date,
  locale: Locale,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(localeTag[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(value));
}

export function formatDuration(milliseconds: number, locale: Locale): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${formatNumber(hours, locale)}h`);
  if (minutes > 0) parts.push(`${formatNumber(minutes, locale)}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${formatNumber(seconds, locale)}s`);
  return parts.join(" ");
}

export function formatReference(value: string, maxLength = 48): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) return normalized;
  const edge = Math.max(8, Math.floor((maxLength - 1) / 2));
  return `${normalized.slice(0, edge)}…${normalized.slice(-edge)}`;
}
