/** Consejos del día: reglas sencillas basadas en carga, energía y equilibrio. */
import type { AppState, CategoryId } from '../types';
import { catById } from '../types';
import { dayLoad, doneMinutes, energyFor, sessionsOn } from './scheduler';
import { addDays, diffDays } from './time';

export interface Tip {
  icon: string;
  text: string;
  action?: 'breathe' | 'add-social' | 'add-bienestar';
}

export function daysSinceCategory(state: AppState, cat: CategoryId, today: string): number {
  const taskCat = new Map(state.tasks.map((t) => [t.id, t.category]));
  let last = state.profile?.createdAt || today;
  for (const s of state.sessions) {
    if (s.status === 'done' && taskCat.get(s.taskId) === cat && s.date > last && s.date <= today) last = s.date;
  }
  return Math.max(0, diffDays(last, today));
}

function hasUpcoming(state: AppState, cat: CategoryId, from: string, days: number): boolean {
  const to = addDays(from, days);
  const taskCat = new Map(state.tasks.map((t) => [t.id, t.category]));
  return state.sessions.some((s) => s.status === 'planned' && s.date >= from && s.date <= to && taskCat.get(s.taskId) === cat);
}

export function tipsFor(state: AppState, date: string, today: string): Tip[] {
  const tips: Tip[] = [];
  const load = dayLoad(state, date);
  const energy = energyFor(state, date);
  const daySessions = sessionsOn(state.sessions, date);
  const allDone = daySessions.length > 0 && daySessions.every((s) => s.status === 'done');

  if (date === today && allDone) {
    tips.push({ icon: '✨', text: '¡Has completado todo lo de hoy! Disfruta del resto del día sin culpa.' });
  }

  if (energy <= 40) {
    tips.push({
      icon: '🪫',
      text: 'Tu energía está baja. Prioriza lo esencial, come algo rico y acuéstate pronto. El resto puede esperar.',
      action: 'breathe',
    });
  }

  if (load.level === 'rojo') {
    tips.push({
      icon: '🧘',
      text: 'Hoy es un día ajetreado. Intenta regalarte al menos 10 minutos de meditación o respiración entre bloques.',
      action: 'breathe',
    });
  } else if (load.level === 'naranja') {
    tips.push({ icon: '💧', text: 'Día con ritmo. Haz pausas de 5 minutos cada hora, estira y bebe agua.' });
  } else if (!allDone && energy > 40) {
    tips.push({
      icon: '🌿',
      text:
        load.level === 'libre'
          ? 'Día libre: buen momento para algo que te llene. Un paseo, leer, llamar a alguien.'
          : 'Día tranquilo. Aprovecha para hacer algo sin prisa y salir a que te dé el sol.',
    });
  }

  if (date === today) {
    const social = daysSinceCategory(state, 'social', today);
    if (social >= 7 && !hasUpcoming(state, 'social', today, 3)) {
      tips.push({
        icon: '💛',
        text: `Hace ${social} días que no dedicas tiempo a tu vida social. ¿Un mensaje o una llamada a alguien que quieras?`,
        action: 'add-social',
      });
    }
    const wellbeing = daysSinceCategory(state, 'bienestar', today);
    if (wellbeing >= 4 && !hasUpcoming(state, 'bienestar', today, 1)) {
      tips.push({
        icon: '🧘',
        text: `Llevas ${wellbeing} días sin un rato de bienestar. Aunque sean 10 minutos, tu cuerpo lo nota.`,
        action: 'add-bienestar',
      });
    }

    // deadlines cercanos
    for (const t of state.tasks) {
      if (t.archived || t.kind !== 'flexible' || !t.deadline) continue;
      const d = diffDays(today, t.deadline);
      if (d < 0 || d > 2) continue;
      const pct = Math.round((doneMinutes(state, t.id) / t.totalMinutes) * 100);
      if (pct >= 100) continue;
      tips.push({
        icon: catById(t.category).emoji,
        text: `${d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : 'Pasado mañana'} vence «${t.title}». Vas por el ${pct}%: un pasito más y listo.`,
      });
      break;
    }
  }

  return tips.slice(0, 3);
}

export const LEVEL_TEXT: Record<string, string> = {
  libre: 'Día libre',
  verde: 'Día tranquilo',
  naranja: 'Día con ritmo',
  rojo: 'Día intenso',
};
