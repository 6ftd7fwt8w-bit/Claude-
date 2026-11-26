export const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function addDays(k: string, n: number): string {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** días de a → b (b - a) */
export function diffDays(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
}

export function rangeDays(a: string, b: string): string[] {
  const out: string[] = [];
  for (let k = a; k <= b; k = addDays(k, 1)) out.push(k);
  return out;
}

export function weekday(k: string): number {
  return fromKey(k).getDay();
}

/** lunes de la semana de k */
export function weekStart(k: string): string {
  return addDays(k, -((weekday(k) + 6) % 7));
}

export function monthKey(k: string): string {
  return k.slice(0, 7);
}

export function hmToMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minToHm(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function ceilTo(n: number, step: number): number {
  return Math.ceil(n / step) * step;
}

export function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

const longFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const shortFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const monthFmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

export const fmtLong = (k: string) => longFmt.format(fromKey(k));
export const fmtShort = (k: string) => shortFmt.format(fromKey(k)).replace(/\./g, '');
export const fmtMonth = (k: string) => monthFmt.format(fromKey(k.length === 7 ? `${k}-01` : k));

export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** "hoy", "mañana", "el jueves", "el 15 dic" */
export function fmtRelative(k: string, today: string): string {
  const d = diffDays(today, k);
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d > 1 && d < 7) return `el ${longFmt.format(fromKey(k)).split(',')[0]}`;
  return `el ${fmtShort(k)}`;
}

/** "a hoy", "a mañana", "al jueves", "al 15 dic" */
export function fmtTo(k: string, today: string): string {
  const r = fmtRelative(k, today);
  if (r === 'hoy') return 'para hoy';
  return r.startsWith('el ') ? `al ${r.slice(3)}` : `a ${r}`;
}
