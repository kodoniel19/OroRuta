import { format, formatDistance, parseISO } from 'date-fns';

/** Fixed "now" for the prototype so relative times stay stable. */
export const NOW = new Date('2026-09-27T10:30:00');

export function formatDate(iso: string) {
  try { return format(parseISO(iso), 'MMM d, yyyy'); } catch { return iso; }
}

export function formatDateTime(iso: string) {
  try { return format(parseISO(iso), "MMM d, yyyy 'at' h:mm a"); } catch { return iso; }
}

export function formatRelative(iso: string) {
  try { return formatDistance(parseISO(iso), new Date(), { addSuffix: true }); } catch { return iso; }
}

export function peso(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value);
}

export function nowIso() {
  return new Date().toISOString();
}