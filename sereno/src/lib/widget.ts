/**
 * Instantánea que se comparte con el widget de iPhone (App Group).
 * El widget no puede ejecutar la lógica de la app: solo pinta estos datos.
 */
import type { AppState } from '../types';
import { catById } from '../types';
import { dayLoad, energyFor, sessionsOn } from './scheduler';
import { phraseOfDay } from './phrases';
import { LEVEL_TEXT } from './tips';
import { addDays, minToHm, monthKey } from './time';
import { monthStats } from './stats';

export interface WidgetSession {
  id: string;
  title: string;
  time: string;
  minutes: number;
  emoji: string;
  color: string;
  done: boolean;
  date: string;
}

export interface WidgetSnapshot {
  updatedAt: string;
  date: string;
  name: string;
  phrase: string;
  energy: number;
  level: string;
  levelText: string;
  done: number;
  total: number;
  /** sesiones de hoy y mañana (el widget elige qué mostrar según la hora) */
  sessions: WidgetSession[];
  leaves: number;
  flowers: number;
  drops: number;
}

export function widgetSnapshot(state: AppState, today: string): WidgetSnapshot {
  const tasks = new Map(state.tasks.map((t) => [t.id, t]));
  const toW = (date: string) =>
    sessionsOn(state.sessions, date).map((s) => {
      const t = tasks.get(s.taskId);
      const c = catById(t?.category ?? 'bienestar');
      return {
        id: s.id,
        title: t?.title ?? '',
        time: minToHm(s.start),
        minutes: s.duration,
        emoji: c.emoji,
        color: c.color,
        done: s.status === 'done',
        date,
      };
    });
  const todays = toW(today);
  const load = dayLoad(state, today);
  const st = monthStats(state, monthKey(today));
  return {
    updatedAt: new Date().toISOString(),
    date: today,
    name: state.profile?.name ?? '',
    phrase: phraseOfDay(today),
    energy: energyFor(state, today),
    level: load.level,
    levelText: LEVEL_TEXT[load.level],
    done: todays.filter((s) => s.done).length,
    total: todays.length,
    sessions: [...todays, ...toW(addDays(today, 1))].slice(0, 12),
    leaves: st.leaves.length,
    flowers: st.roundDays,
    drops: state.drops,
  };
}

/** Acciones que el widget deja apuntadas para que la app las aplique al abrirse. */
export interface WidgetAction {
  type: 'complete';
  sessionId: string;
  at: string;
}
