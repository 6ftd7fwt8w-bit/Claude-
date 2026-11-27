/**
 * Valores: lo que es importante para ti y cuánto tiempo quieres dedicarle.
 * Sereno organiza el resto alrededor de esto y te enseña cómo vas.
 */
import type { AppState, AreaId, Task, ValueGoal } from '../types';
import { catById } from '../types';
import { addTask, ensureHabits, type Ctx } from './scheduler';
import { addDays, diffDays, fmtDuration, monthEnd, weekStart } from './time';

export interface AreaInfo {
  id: AreaId;
  label: string;
  emoji: string;
  /** pauta contrastada (o, si no hay cifra oficial, por qué importa) */
  guideline: string;
  /** mínimo razonable en horas/mes, si hay pauta con cifra */
  minPerMonth?: number;
  /** cómo se llama el bloque que se crea para cumplirlo */
  blockTitle: string;
  blockMinutes: number;
}

export const AREAS: AreaInfo[] = [
  {
    id: 'familia',
    label: 'Familia',
    emoji: '⌂',
    guideline:
      'El Estudio de Harvard sobre el Desarrollo Adulto, que sigue a personas desde 1938, encontró que la calidad de las relaciones cercanas es de lo que más se asocia a la salud y la felicidad a largo plazo.',
    blockTitle: 'Tiempo en familia',
    blockMinutes: 120,
  },
  {
    id: 'pareja',
    label: 'Amor y pareja',
    emoji: '♡',
    guideline:
      'Reservar tiempo de calidad en pareja se asocia a más satisfacción en la relación: el informe «The Date Night Opportunity» (National Marriage Project, 2012) encontró que las parejas que salen juntas a solas con regularidad dicen sentirse más felices en su relación.',
    blockTitle: 'Tiempo en pareja',
    blockMinutes: 120,
  },
  {
    id: 'social',
    label: 'Amigos y vida social',
    emoji: '⁂',
    guideline:
      'Las amistades se construyen con tiempo compartido: un estudio de la Universidad de Kansas (Hall, 2018) estimó que hacen falta unas 50 horas juntos para pasar de conocido a amigo ocasional, unas 90 para ser amigos y más de 200 para una amistad íntima.',
    blockTitle: 'Tiempo con amigos',
    blockMinutes: 120,
  },
  {
    id: 'bienestar',
    label: 'Salud y movimiento',
    emoji: '◎',
    guideline:
      'La OMS recomienda a los adultos entre 150 y 300 minutos a la semana de actividad física moderada (unas 10–20 h al mes). Otro estudio (White et al., 2019) asoció pasar al menos 120 minutos a la semana en la naturaleza con más salud y bienestar.',
    minPerMonth: 10,
    blockTitle: 'Moverme y cuidar mi salud',
    blockMinutes: 45,
  },
  {
    id: 'autocuidado',
    label: 'Tiempo para mí',
    emoji: '☾',
    guideline:
      'Reservar tiempo para descansar y desconectar ayuda a reducir el estrés y a recuperar energía. No hay una cifra oficial: lo importante es que sea regular.',
    blockTitle: 'Tiempo para mí',
    blockMinutes: 60,
  },
  {
    id: 'proyectos',
    label: 'Proyectos personales',
    emoji: '✦',
    guideline:
      'Avanzar en algo que te importa da sentido y satisfacción. Mejor poco y constante que mucho de golpe: sesiones regulares con descansos rinden más.',
    blockTitle: 'Avanzar en mis proyectos',
    blockMinutes: 90,
  },
  {
    id: 'aficiones',
    label: 'Aficiones y ocio',
    emoji: '❖',
    guideline: 'El ocio que disfrutas (tocar, crear, jugar) recarga la mente y la creatividad. Cuenta como descanso de verdad.',
    blockTitle: 'Mis aficiones',
    blockMinutes: 60,
  },
];

export const areaInfo = (id: AreaId) => AREAS.find((a) => a.id === id)!;

export interface Vision {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** horas al mes por área */
  hours: Record<AreaId, number>;
}

export const VISIONS: Vision[] = [
  {
    id: 'yo',
    emoji: '◐',
    title: 'Darme prioridad a mí',
    description: 'Cuidarte primero: salud, descanso y cosas que te gustan. Lo demás llega mejor desde ahí.',
    hours: { bienestar: 14, autocuidado: 12, aficiones: 10, social: 8, familia: 12, pareja: 8, proyectos: 6 },
  },
  {
    id: 'proyectos',
    emoji: '✦',
    title: 'Avanzar en mis proyectos',
    description: 'Darle un empujón a lo que quieres crear, sin dejar de moverte ni de ver a la gente.',
    hours: { proyectos: 30, bienestar: 12, autocuidado: 6, aficiones: 4, social: 6, familia: 10, pareja: 8 },
  },
  {
    id: 'familia',
    emoji: '◍',
    title: 'Familia y personas',
    description: 'Más tiempo de calidad con los tuyos y con tus amigos.',
    hours: { familia: 40, pareja: 16, social: 12, bienestar: 10, autocuidado: 6, aficiones: 4, proyectos: 6 },
  },
  {
    id: 'equilibrio',
    emoji: '◑',
    title: 'Equilibrio en todo',
    description: 'Un poco de cada cosa, cada semana. Ideal si no sabes por dónde empezar.',
    hours: { familia: 16, pareja: 10, social: 10, bienestar: 12, autocuidado: 8, aficiones: 8, proyectos: 12 },
  },
];

export function goalsFromVision(v: Vision): ValueGoal[] {
  return AREAS.map((a) => ({ area: a.id, hours: v.hours[a.id], per: 'mes' as const })).filter((g) => g.hours > 0);
}

export const monthlyHours = (g: ValueGoal) => (g.per === 'semana' ? g.hours * 4.3 : g.hours);
export const weeklyMinutes = (g: ValueGoal) => Math.round((g.per === 'semana' ? g.hours * 60 : (g.hours * 60) / 4.3));

/** avisos si una meta está por debajo de una pauta con cifra */
export function guidelineWarning(g: ValueGoal): string | undefined {
  const a = areaInfo(g.area);
  if (a.minPerMonth && monthlyHours(g) < a.minPerMonth) {
    return `Por debajo de lo que recomienda la OMS (unas ${a.minPerMonth} h al mes de actividad física).`;
  }
  return undefined;
}

// ---------------------------------------------------------------- cómo vas

export interface ValueProgress {
  goal: ValueGoal;
  info: AreaInfo;
  color: string;
  from: string;
  to: string;
  done: number; // minutos hechos en el periodo
  planned: number; // minutos hechos + planificados en el periodo
  target: number; // minutos objetivo del periodo
  expected: number; // minutos que tocaría llevar hoy
  status: 'genial' | 'bien' | 'poco';
}

export function valueProgress(state: AppState, today: string): ValueProgress[] {
  const cat = new Map(state.tasks.map((t) => [t.id, t.category]));
  return (state.values ?? []).map((goal) => {
    const from = goal.per === 'semana' ? weekStart(today) : `${today.slice(0, 7)}-01`;
    const to = goal.per === 'semana' ? addDays(from, 6) : monthEnd(today);
    const inPeriod = state.sessions.filter((s) => s.date >= from && s.date <= to && cat.get(s.taskId) === goal.area);
    const done = inPeriod.filter((s) => s.status === 'done').reduce((a, s) => a + s.duration, 0);
    const planned = inPeriod.reduce((a, s) => a + s.duration, 0);
    // si empezaste a usar Sereno a mitad de periodo, el objetivo se reparte desde ese día
    const started = state.profile?.createdAt && state.profile.createdAt > from ? state.profile.createdAt : from;
    const span = diffDays(from, to) + 1;
    const live = Math.max(1, diffDays(started, to) + 1);
    const target = Math.round((goal.hours * 60 * live) / span);
    // solo días ya terminados: hoy todavía puedes hacerlo
    const elapsed = Math.min(live, Math.max(0, diffDays(started, today)));
    const expected = Math.round((target * elapsed) / live);
    const ratio = expected ? done / expected : 1;
    // al principio (menos de media hora esperada) no tiene sentido decir que vas mal
    const status = done >= target || ratio >= 0.9 ? 'genial' : ratio >= 0.5 || expected < 30 ? 'bien' : 'poco';
    return { goal, info: areaInfo(goal.area), color: catById(goal.area).color, from, to, done, planned, target, expected, status };
  });
}

export function valuesMessage(list: ValueProgress[]): { title: string; text: string; tone: 'genial' | 'bien' | 'poco' } {
  if (!list.length) return { title: 'Define tus valores', text: 'Dime qué es importante para ti y cuánto tiempo quieres dedicarle.', tone: 'bien' };
  const behind = list.filter((p) => p.status === 'poco').sort((a, b) => a.done / Math.max(1, a.expected) - b.done / Math.max(1, b.expected));
  if (!behind.length) {
    return list.every((p) => p.status === 'genial')
      ? { title: '¡Lo estás haciendo genial!', text: 'Estás dedicando tiempo a todo lo que te importa. Así se vive con equilibrio.', tone: 'genial' }
      : { title: 'Vas bien', text: 'Tu tiempo está bastante repartido entre lo que te importa. Sigue así, sin prisa.', tone: 'bien' };
  }
  const b = behind[0];
  const period = b.goal.per === 'semana' ? 'esta semana' : 'este mes';
  return {
    title: `Intenta dedicar un poco más a ${b.info.label.toLowerCase()}`,
    text: `Llevas ${fmtDuration(b.done)} de ${fmtDuration(b.target)} ${period}.${b.planned < b.target ? ' Puedo buscarte huecos para ello.' : ' Ya tienes tiempo reservado: aprovéchalo.'}`,
    tone: 'poco',
  };
}

// ---------------------------------------------------------------- organizar según los valores

/** minutos por semana que ya cubren tus tareas en un área (sin contar los bloques automáticos) */
function coveredWeekly(state: AppState, area: AreaId, today: string): number {
  let min = 0;
  for (const t of state.tasks) {
    if (t.archived || t.category !== area || t.valueBlock) continue;
    if (t.kind === 'habito') min += t.timesPerMonth ? (t.totalMinutes * t.timesPerMonth) / 4.3 : t.totalMinutes * (t.days?.length || t.timesPerWeek || 1);
    if (t.kind === 'flexible') {
      const weeks = t.deadline ? Math.max(1, (diffDays(today, t.deadline) + 1) / 7) : 2;
      min += t.totalMinutes / weeks;
    }
  }
  return min;
}

/**
 * Crea (o actualiza) bloques recurrentes para llegar a cada valor:
 * p. ej. «Tiempo en familia» 3 veces por semana si tus tareas no llegan a las 10 h.
 */
export function applyValues(state: AppState, values: ValueGoal[], ctx: Ctx): { state: AppState; created: string[] } {
  // quitamos los bloques automáticos anteriores (lo planificado; lo hecho se queda)
  const oldIds = new Set(state.tasks.filter((t) => t.valueBlock && !t.archived).map((t) => t.id));
  let s: AppState = {
    ...state,
    values,
    tasks: state.tasks.map((t) => (oldIds.has(t.id) ? { ...t, archived: true } : t)),
    sessions: state.sessions.filter((x) => !(oldIds.has(x.taskId) && x.status === 'planned')),
  };
  const created: string[] = [];
  for (const g of values) {
    const info = areaInfo(g.area);
    // los proyectos concretos ya cuentan: solo creamos un bloque genérico si no hay ninguno
    if (g.area === 'proyectos' && s.tasks.some((t) => !t.archived && t.category === 'proyectos')) continue;
    if (g.area === 'aficiones' && s.tasks.some((t) => !t.archived && !t.valueBlock && t.category === 'aficiones' && t.kind === 'habito')) continue;
    const gap = weeklyMinutes(g) - coveredWeekly(s, g.area, ctx.today);
    if (gap < 30) continue;
    const chunk = Math.min(info.blockMinutes, Math.max(30, Math.round(gap / 15) * 15));
    const perWeek = gap / chunk;
    const input =
      perWeek >= 1
        ? { timesPerWeek: Math.min(7, Math.round(perWeek)) }
        : { timesPerMonth: Math.max(1, Math.round(perWeek * 4.3)) };
    const r = addTask(s, { title: info.blockTitle, category: g.area, kind: 'habito', totalMinutes: chunk, icon: info.emoji, ...input }, ctx);
    const id = r.state.tasks[r.state.tasks.length - 1].id;
    s = { ...r.state, tasks: r.state.tasks.map((t) => (t.id === id ? ({ ...t, valueBlock: g.area } as Task) : t)) };
    created.push(`${info.emoji} ${info.blockTitle}: ${fmtDuration(chunk)} ${input.timesPerWeek ? `${input.timesPerWeek}×/semana` : `${input.timesPerMonth}×/mes`}`);
  }
  s = ensureHabits(s, ctx);
  return { state: s, created };
}

/** Si ya tienes proyectos o aficiones concretas, el bloque genérico («Avanzar en mis proyectos», «Mis aficiones») sobra */
export function pruneValueBlocks(state: AppState): AppState {
  let s = state;
  for (const area of ['proyectos', 'aficiones'] as const) {
    const hasReal = s.tasks.some((t) => !t.archived && !t.valueBlock && t.category === area && (area === 'proyectos' || t.kind === 'habito'));
    const block = s.tasks.find((t) => !t.archived && t.valueBlock === area);
    if (!hasReal || !block) continue;
    s = {
      ...s,
      tasks: s.tasks.map((t) => (t.id === block.id ? { ...t, archived: true } : t)),
      sessions: s.sessions.filter((x) => !(x.taskId === block.id && x.status === 'planned')),
    };
  }
  return s;
}
