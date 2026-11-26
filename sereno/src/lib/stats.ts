import type { AppState, CategoryId, Session } from '../types';
import { CATEGORIES } from '../types';
import { addDays, monthKey } from './time';

export interface MonthStats {
  leaves: { id: string; category: CategoryId; big: boolean }[];
  buds: number;
  roundDays: number;
  doneSessions: number;
  plannedLeft: number;
  minutesByCat: Record<CategoryId, number>;
}

export function monthStats(state: AppState, month: string): MonthStats {
  const taskCat = new Map(state.tasks.map((t) => [t.id, t.category]));
  const inMonth = state.sessions.filter((s) => monthKey(s.date) === month);
  const done = inMonth
    .filter((s) => s.status === 'done')
    .sort((a, b) => (a.completedAt ?? a.date).localeCompare(b.completedAt ?? b.date));
  const minutesByCat = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<CategoryId, number>;
  for (const s of done) {
    const c = taskCat.get(s.taskId) ?? 'bienestar';
    minutesByCat[c] += s.duration;
  }
  const byDay = new Map<string, Session[]>();
  for (const s of inMonth) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
  let roundDays = 0;
  for (const list of byDay.values()) if (list.length && list.every((s) => s.status === 'done')) roundDays++;
  const plannedLeft = inMonth.filter((s) => s.status === 'planned').length;
  return {
    leaves: done.map((s) => ({ id: s.id, category: taskCat.get(s.taskId) ?? 'bienestar', big: s.duration >= 90 })),
    buds: plannedLeft,
    roundDays,
    doneSessions: done.length,
    plannedLeft,
    minutesByCat,
  };
}

/** días seguidos (hasta hoy) con al menos una cosa hecha; si hoy aún no, cuenta desde ayer */
export function streak(state: AppState, today: string): number {
  const days = new Set(state.sessions.filter((s) => s.status === 'done').map((s) => s.date));
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
