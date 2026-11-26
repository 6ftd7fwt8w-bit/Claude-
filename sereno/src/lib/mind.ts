/**
 * Mente tranquila → máximo potencial.
 *
 * La idea de Sereno: rindes más con la mente descansada. Aquí está todo lo que "analiza":
 *  - el plan inicial (qué hace Sereno con tu semana y por qué),
 *  - el índice de cada día (energía, carga, recarga y descanso),
 *  - y lo que aprende de TUS datos (qué días y horas te funcionan mejor).
 *
 * Todo son reglas sencillas y transparentes, calculadas en el dispositivo.
 * No es un diagnóstico ni sustituye a un profesional de la salud.
 */
import type { AppState, CategoryId, Profile } from '../types';
import { baseFreeMinutes, breaksFor, dayLoad, energyFor, sessionsOn, type NewTaskInput } from './scheduler';
import { addDays, diffDays, fmtDuration, minToHm, todayKey, weekStart } from './time';

const FOCUS: CategoryId[] = ['proyectos', 'trabajo'];
const RECHARGE: CategoryId[] = ['bienestar', 'autocuidado', 'social', 'aficiones'];

// ---------------------------------------------------------------- análisis del plan (al terminar la encuesta)

export interface AnalysisStep {
  icon: string;
  doing: string; // lo que se ve mientras "analiza"
  result: string; // lo que ha encontrado / hecho
}

export interface PlanAnalysis {
  steps: AnalysisStep[];
  weekFree: number;
  focusPerWeek: number;
  rechargePerWeek: number;
  /** recarga semanal recomendada para el foco que te pides */
  rechargeTarget: number;
  /** se recomienda añadir una recarga diaria */
  suggestRecharge: boolean;
  /** % del tiempo libre que piden tus objetivos y cotidianas */
  demand: number;
}

/** Minutos por semana que pide una tarea */
export function weeklyMinutes(t: NewTaskInput, today = todayKey()): number {
  if (t.kind === 'habito') return t.timesPerMonth ? (t.totalMinutes * t.timesPerMonth) / 4.3 : t.totalMinutes * (t.days?.length || t.timesPerWeek || 1);
  if (t.kind === 'flexible') {
    const weeks = t.deadline ? Math.max(1, (diffDays(today, t.deadline) + 1) / 7) : 2;
    return t.totalMinutes / weeks;
  }
  return 0;
}

export const RECHARGE_TASK: NewTaskInput = {
  title: 'Recarga: respirar o pasear',
  category: 'bienestar',
  kind: 'habito',
  totalMinutes: 10,
  timesPerWeek: 5,
  icon: '🫧',
};

export function analyzePlan(p: Profile, tasks: NewTaskInput[], today = todayKey()): PlanAnalysis {
  const ws = weekStart(today);
  const weekFree = Array.from({ length: 7 }, (_, d) => baseFreeMinutes(p, addDays(ws, d))).reduce((a, b) => a + b, 0);
  const sum = (f: (t: NewTaskInput) => boolean) => Math.round(tasks.filter(f).reduce((a, t) => a + weeklyMinutes(t, today), 0));
  const focusPerWeek = sum((t) => FOCUS.includes(t.category) && !t.routine);
  const rechargePerWeek = sum((t) => RECHARGE.includes(t.category) && !t.routine);
  const routinePerWeek = sum((t) => !!t.routine);
  const rechargeTarget = Math.max(60, Math.round(focusPerWeek * 0.25));
  const suggestRecharge = rechargePerWeek < rechargeTarget;
  const demand = Math.round(((focusPerWeek + rechargePerWeek + routinePerWeek) / Math.max(1, weekFree)) * 100);
  const breaks = p.works ? (p.breaks ?? []).length : 0;
  const best = p.chronotype === 'manana' ? 'por la mañana' : p.chronotype === 'noche' ? 'por la tarde-noche' : 'en tus huecos más tranquilos';

  const steps: AnalysisStep[] = [
    {
      icon: '🕰️',
      doing: 'Analizando tu ritmo y tus horas reales…',
      result: `Tienes ${fmtDuration(weekFree)} libres a la semana después de trabajo, comidas y descanso.`,
    },
    {
      icon: '🌙',
      doing: 'Protegiendo tu sueño y tu desconexión…',
      result: `${fmtDuration(p.relaxMinutes)} cada noche sin tareas, y te acuestas a las ${minToHm(p.bed)}. Dormir bien es la base de todo lo demás.`,
    },
    {
      icon: '⚖️',
      doing: 'Equilibrando foco y recarga…',
      result: focusPerWeek
        ? `Te pides ${fmtDuration(focusPerWeek)} de foco a la semana. Para sostenerlo sin quemarte te recomiendo al menos ${fmtDuration(rechargeTarget)} de recarga${suggestRecharge ? ` (ahora tienes ${fmtDuration(rechargePerWeek)})` : ': lo tienes cubierto 👏'}.`
        : `Tienes ${fmtDuration(rechargePerWeek)} de recarga a la semana. Cuando añadas proyectos, cuidaré que no falte.`,
    },
    {
      icon: '☕',
      doing: 'Añadiendo descansos para mantener la concentración…',
      result: breaks
        ? `Usaré ${breaks === 1 ? 'tu pausa' : `tus ${breaks} pausas`} de trabajo para recargar: respirar, estirar, moverte.`
        : 'Dejaré 10 minutos de margen entre una cosa y otra para que respires.',
    },
    {
      icon: '🎯',
      doing: 'Colocando lo que pide foco en tus mejores horas…',
      result: `Tus proyectos irán ${best}, y antes de cada sesión tendrás 10 minutos para prepararte con calma.`,
    },
    {
      icon: '🌿',
      doing: 'Calculando una carga sostenible…',
      result:
        demand > 70
          ? `Tu semana pide el ${demand}% de tu tiempo libre: es exigente. Repartiré con margen y te avisaré si algo no cabe.`
          : `Tu semana pide el ${demand}% de tu tiempo libre: un ritmo sostenible, con aire para imprevistos.`,
    },
  ];
  return { steps, weekFree, focusPerWeek, rechargePerWeek, rechargeTarget, suggestRecharge, demand };
}

// ---------------------------------------------------------------- índice del día

export interface MindFactor {
  key: 'energia' | 'carga' | 'recarga' | 'descanso';
  label: string;
  value: number; // 0..1
  note: string;
}

export interface MindIndex {
  score: number; // 0..100
  title: string;
  message: string;
  factors: MindFactor[];
  /** sesión de foco sin recarga en las 3 horas previas (para proponer una) */
  focusWithoutRecharge?: { sessionId: string; title: string; start: number };
}

export function mindIndex(state: AppState, date: string): MindIndex {
  const p = state.profile!;
  const cat = new Map(state.tasks.map((t) => [t.id, t]));
  const day = sessionsOn(state.sessions, date);
  const focus = day.filter((x) => FOCUS.includes(cat.get(x.taskId)?.category ?? 'bienestar'));
  const recharge = day.filter((x) => RECHARGE.includes(cat.get(x.taskId)?.category ?? 'proyectos'));
  const focusMin = focus.reduce((a, x) => a + x.duration, 0);
  const rechargeMin = recharge.reduce((a, x) => a + x.duration, 0) + breaksFor(p, date).reduce((a, b) => a + Math.min(b.duration, 15) / 2, 0);
  const rechargeTarget = Math.max(15, focusMin * 0.25);

  const energy = energyFor(state, date);
  const load = dayLoad(state, date);
  const carga = load.planned === 0 ? 1 : Math.max(0, Math.min(1, (1.3 - load.ratio) / (1.3 - 0.55)));
  const recarga = Math.min(1, rechargeMin / rechargeTarget);
  const descanso = Math.min(1, p.relaxMinutes / 60);

  const factors: MindFactor[] = [
    { key: 'energia', label: 'Energía', value: energy / 100, note: energy <= 40 ? 'Baja: hoy, lo esencial' : energy >= 80 ? 'Alta: buen día para lo importante' : 'Normal' },
    { key: 'carga', label: 'Carga sostenible', value: carga, note: load.level === 'rojo' ? 'Más de lo recomendable' : load.level === 'naranja' ? 'Justa' : 'Con margen' },
    {
      key: 'recarga',
      label: 'Recarga',
      value: recarga,
      note: focusMin ? `${fmtDuration(Math.round(rechargeMin))} para ${fmtDuration(focusMin)} de foco` : rechargeMin ? `${fmtDuration(Math.round(rechargeMin))} para ti` : 'Sin recarga planificada',
    },
    { key: 'descanso', label: 'Descanso protegido', value: descanso, note: `${fmtDuration(p.relaxMinutes)} para desconectar` },
  ];
  const score = Math.round((factors[0].value * 0.25 + carga * 0.25 + recarga * 0.3 + descanso * 0.2) * 100);

  let title: string;
  let message: string;
  if (score >= 75) {
    title = 'Mente en calma';
    message = 'Buen día para avanzar en lo importante: tienes energía, margen y recarga.';
  } else if (score >= 50) {
    title = 'Equilibrio aceptable';
    message = 'Vas bien. Cuida las pausas para llegar con la cabeza clara a lo que pide foco.';
  } else {
    title = 'Día exigente';
    message = 'Hoy rendirás más si recargas primero. Menos cosas, con más calma.';
  }

  // ¿hay alguna sesión de foco sin un rato de recarga justo antes?
  const first = focus
    .filter((x) => x.status === 'planned')
    .find((x) => !day.some((r) => recharge.includes(r) && r.start + r.duration <= x.start && x.start - (r.start + r.duration) <= 180));
  return {
    score,
    title,
    message,
    factors,
    focusWithoutRecharge: first ? { sessionId: first.id, title: cat.get(first.taskId)?.title ?? '', start: first.start } : undefined,
  };
}

// ---------------------------------------------------------------- lo que aprende de tus datos

export interface Insight {
  icon: string;
  text: string;
}

export function personalInsights(state: AppState, today: string): Insight[] {
  const days = Object.entries(state.history ?? {})
    .filter(([d]) => d < today && d >= addDays(today, -28))
    .map(([, r]) => r);
  const out: Insight[] = [];
  const rate = (list: typeof days) => {
    const planned = list.reduce((a, r) => a + r.focusPlanned, 0);
    return planned ? list.reduce((a, r) => a + r.focusDone, 0) / planned : null;
  };
  const withFocus = days.filter((r) => r.focusPlanned > 0);

  const withRecharge = withFocus.filter((r) => r.rechargeMinutes > 0);
  const without = withFocus.filter((r) => r.rechargeMinutes === 0);
  const a = rate(withRecharge);
  const b = rate(without);
  if (withRecharge.length >= 3 && without.length >= 3 && a != null && b != null) {
    const pa = Math.round(a * 100);
    const pb = Math.round(b * 100);
    out.push({
      icon: '🧘',
      text:
        pa > pb + 5
          ? `Los días en que te cuidaste (bienestar, gente, tiempo para ti) completaste el ${pa}% de tus sesiones de foco; los demás días, el ${pb}%. Tu mente descansada rinde más.`
          : `Completaste el ${pa}% de tus sesiones de foco los días con recarga y el ${pb}% sin ella. Seguiré observando.`,
    });
  }

  const am = withFocus.reduce((x, r) => [x[0] + r.focusDoneAm, x[1] + r.focusPlannedAm], [0, 0]);
  const pm = withFocus.reduce((x, r) => [x[0] + r.focusDonePm, x[1] + r.focusPlannedPm], [0, 0]);
  if (am[1] >= 4 && pm[1] >= 4) {
    const ra = am[0] / am[1];
    const rp = pm[0] / pm[1];
    if (Math.abs(ra - rp) >= 0.15) {
      out.push({
        icon: ra > rp ? '🌅' : '🌙',
        text: `Te concentras mejor ${ra > rp ? 'por la mañana' : 'por la tarde'}: completas el ${Math.round(Math.max(ra, rp) * 100)}% de esas sesiones frente al ${Math.round(Math.min(ra, rp) * 100)}%. Puedes cambiar tu cronotipo en Rutina.`,
      });
    }
  }

  const high = withFocus.filter((r) => r.energy >= 60);
  const low = withFocus.filter((r) => r.energy <= 40);
  const rh = rate(high);
  const rl = rate(low);
  if (high.length >= 3 && low.length >= 2 && rh != null && rl != null) {
    out.push({
      icon: '🔋',
      text: `Con energía alta completas el ${Math.round(rh * 100)}% de lo que pide foco; con energía baja, el ${Math.round(rl * 100)}%. Por eso los días flojos te propongo menos.`,
    });
  }

  const recharged = days.filter((r) => r.rechargeMinutes > 0).length;
  if (days.length >= 5) {
    out.push({
      icon: '🌿',
      text: `En las últimas semanas te has dado recarga ${recharged} de ${days.length} días (${fmtDuration(days.reduce((x, r) => x + r.rechargeMinutes, 0))} en total).`,
    });
  }
  return out;
}

// ---------------------------------------------------------------- por qué funciona

export const SCIENCE: { icon: string; title: string; text: string }[] = [
  {
    icon: '🧘',
    title: 'Unos minutos de calma',
    text: 'Distintos estudios relacionan la práctica breve de atención plena (mindfulness) con menos estrés percibido y mejor capacidad de atención. No hace falta mucho: unos minutos con constancia.',
  },
  {
    icon: '☕',
    title: 'Pausas que recargan',
    text: 'La concentración se agota con el tiempo. Las pausas cortas ayudan a recuperar energía mental y a mantener el rendimiento a lo largo del día.',
  },
  {
    icon: '🚶',
    title: 'Moverse da ideas',
    text: 'En un estudio de la Universidad de Stanford (2014), caminar aumentó la generación de ideas creativas frente a estar sentado. Un paseo antes de crear puede ayudar.',
  },
  {
    icon: '😴',
    title: 'Dormir para pensar mejor',
    text: 'El sueño es clave para la memoria, el aprendizaje y la resolución de problemas. Por eso Sereno protege tu desconexión y tu hora de dormir.',
  },
  {
    icon: '🫶',
    title: 'Las personas importan',
    text: 'Las relaciones cercanas son uno de los factores más asociados al bienestar a largo plazo. Por eso tu vida social también tiene hueco en el plan.',
  },
  {
    icon: '🌅',
    title: 'Tus mejores horas',
    text: 'Cada persona tiene momentos del día en que se concentra mejor (su cronotipo). Colocar lo difícil ahí cuesta menos esfuerzo.',
  },
];

export const DISCLAIMER =
  'Sereno te ayuda a organizarte con equilibrio a partir de reglas sencillas y de tus propios datos. No es un diagnóstico ni sustituye el consejo de un profesional de la salud. Si te sientes desbordado o desbordada de forma continuada, habla con un profesional.';
