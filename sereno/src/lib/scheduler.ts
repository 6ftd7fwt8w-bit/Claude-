/**
 * Planificador de Sereno.
 *
 * Idea: cada día tiene un "tiempo libre base" (lo que queda tras dormir, rutina de
 * mañana, trabajo + desplazamiento, comidas y el tiempo de desconexión antes de
 * dormir). De ese tiempo libre solo usamos una parte, según la energía del día:
 * es la "capacidad". Las tareas flexibles se trocean en sesiones y se reparten
 * entre hoy y su deadline, priorizando los días con más capacidad sobrante.
 *
 * Todas las funciones son puras: reciben un AppState y devuelven uno nuevo.
 */
import type { AppState, DayRecord, Profile, Session, Task, TimeOfDay, WorkBreak, WorkHours } from '../types';
import { addDays, ceilTo, fmtRelative, fmtTo, minToHm, monthEnd, rangeDays, weekStart, weekday } from './time';

export interface Ctx {
  today: string;
  now: number; // minutos desde las 00:00
}

export interface Interval {
  start: number;
  end: number;
}

export interface Result {
  state: AppState;
  message?: string;
}

export const STEP = 15; // las sesiones empiezan en múltiplos de 15 min
export const BUFFER = 10; // respiro entre una cosa y otra
export const NO_DEADLINE_HORIZON = 13; // días para repartir lo que no tiene fecha
export const GREEN = 0.55; // hasta este % de la capacidad, el día es "tranquilo"

let idCounter = 0;
export function uid(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${idCounter}`;
}

// ---------------------------------------------------------------- tiempo libre

export function bedEff(p: Profile): number {
  // si se acuesta después de medianoche, el día "acaba" a las 24:00
  return p.bed <= p.wake ? 1440 : p.bed;
}

export function isWorkDay(p: Profile, date: string): boolean {
  return p.works && p.workDays.includes(weekday(date));
}

/** horario de trabajo de ese día (o null si no se trabaja) */
export function workHours(p: Profile, date: string): WorkHours | null {
  if (!isWorkDay(p, date)) return null;
  return p.workByDay?.[weekday(date)] ?? { start: p.workStart, end: p.workEnd };
}

export function isRemote(p: Profile, date: string): boolean {
  return (p.remoteDays ?? []).includes(weekday(date));
}

/** pausas de ese día: las elegidas para ese día o, si trabaja, las habituales */
export function breaksFor(p: Profile, date: string): WorkBreak[] {
  return p.breaksOn?.[date] ?? (isWorkDay(p, date) ? (p.breaks ?? []) : []);
}

export function baseBusy(p: Profile, date: string): Interval[] {
  const busy: Interval[] = [{ start: 0, end: p.wake + p.morningRoutine }];
  const w = workHours(p, date);
  if (w) {
    const commute = isRemote(p, date) ? 0 : p.commute;
    const work = { start: w.start - commute, end: w.end + commute };
    // las pausas abren pequeños huecos dentro de la jornada
    const gaps = breaksFor(p, date).map((b) => ({ start: b.start, end: b.start + b.duration }));
    busy.push(...complement(gaps, work.start, work.end));
  }
  busy.push({ start: p.lunch, end: p.lunch + p.lunchDuration });
  busy.push({ start: p.dinner, end: p.dinner + p.dinnerDuration });
  busy.push({ start: Math.max(0, bedEff(p) - p.relaxMinutes), end: 1440 });
  return busy;
}

export function complement(busy: Interval[], from = 0, to = 1440): Interval[] {
  const sorted = busy
    .map((b) => ({ start: Math.max(from, b.start), end: Math.min(to, b.end) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);
  const free: Interval[] = [];
  let cursor = from;
  for (const b of sorted) {
    if (b.start > cursor) free.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < to) free.push({ start: cursor, end: to });
  return free;
}

export function baseFreeMinutes(p: Profile, date: string): number {
  return complement(baseBusy(p, date)).reduce((acc, i) => acc + (i.end - i.start), 0);
}

export function energyFor(state: AppState, date: string): number {
  return state.energy[date] ?? state.profile?.defaultEnergy ?? 60;
}

/** con 100% de energía usamos como mucho el 90% del tiempo libre; con 20%, el 18% */
export function energyFactor(energy: number): number {
  return (Math.max(10, Math.min(100, energy)) / 100) * 0.9;
}

export function capacity(state: AppState, date: string): number {
  const p = state.profile;
  if (!p) return 0;
  let c = baseFreeMinutes(p, date) * energyFactor(energyFor(state, date));
  if (p.gentleWeekends && !isWorkDay(p, date)) c *= 0.75;
  return Math.round(c);
}

export function sessionsOn(sessions: Session[], date: string): Session[] {
  return sessions.filter((s) => s.date === date).sort((a, b) => a.start - b.start);
}

export function plannedMinutes(sessions: Session[], date: string): number {
  return sessions.reduce((acc, s) => (s.date === date ? acc + s.duration : acc), 0);
}

export type Level = 'libre' | 'verde' | 'naranja' | 'rojo';

export interface DayLoad {
  planned: number;
  capacity: number;
  ratio: number;
  level: Level;
}

export function dayLoad(state: AppState, date: string): DayLoad {
  const planned = plannedMinutes(state.sessions, date);
  const cap = capacity(state, date);
  const ratio = planned / Math.max(cap, 1);
  let level: Level = 'rojo';
  if (planned === 0) level = 'libre';
  else if (ratio <= GREEN + 0.001) level = 'verde';
  else if (ratio <= 0.9) level = 'naranja';
  return { planned, capacity: cap, ratio, level };
}

// ---------------------------------------------------------------- huecos

function notBeforeFor(date: string, ctx: Ctx): number {
  return date === ctx.today ? ceilTo(ctx.now + 5, STEP) : 0;
}

export function freeWindows(p: Profile, date: string, sessions: Session[], notBefore = 0): Interval[] {
  const busy = [
    ...baseBusy(p, date),
    ...sessionsOn(sessions, date).map((s) => ({ start: s.start - BUFFER, end: s.start + s.duration + BUFFER })),
  ];
  if (notBefore > 0) busy.push({ start: 0, end: notBefore });
  return complement(busy);
}

export const TIME_RANGES: Record<TimeOfDay, Interval> = {
  manana: { start: 0, end: 14 * 60 },
  tarde: { start: 14 * 60, end: 20 * 60 + 30 },
  noche: { start: 19 * 60, end: 1440 },
  cualquiera: { start: 0, end: 1440 },
};

export function findSlot(
  p: Profile,
  date: string,
  sessions: Session[],
  duration: number,
  notBefore = 0,
  preferLate = false,
  range: Interval = TIME_RANGES.cualquiera,
): number | null {
  const windows = freeWindows(p, date, sessions, notBefore)
    .map((w) => ({ start: Math.max(w.start, range.start), end: Math.min(w.end, range.end) }))
    .filter((w) => w.end > w.start);
  const ordered = preferLate ? [...windows].reverse() : windows;
  for (const w of ordered) {
    const s = ceilTo(w.start, STEP);
    if (s + duration <= w.end) return s;
  }
  return null;
}

export function splitChunks(total: number, size: number): number[] {
  const sz = Math.max(15, size);
  const n = Math.floor(total / sz);
  const rest = total - n * sz;
  const arr: number[] = Array(n).fill(sz);
  if (rest > 0) {
    if (rest < 20 && arr.length) arr[arr.length - 1] += rest;
    else arr.push(rest);
  }
  return arr;
}

/** la vida social y el autocuidado, por la tarde; los proyectos, cuando mejor te concentras */
export function prefersLate(p: Profile, task: Task): boolean {
  if (task.timeOfDay === 'tarde' || task.timeOfDay === 'noche') return true;
  if (task.timeOfDay === 'manana') return false;
  if (task.category === 'social' || task.category === 'autocuidado') return true;
  if (task.category === 'proyectos' || task.category === 'trabajo') return p.chronotype === 'noche';
  return false;
}

interface PlaceResult {
  sessions: Session[];
  placed: Session[];
  unplaced: number;
}

/** Coloca trozos de una tarea en los días dados, buscando equilibrio. */
export function placeChunks(
  state: AppState,
  task: Task,
  chunks: number[],
  days: string[],
  ctx: Ctx,
  maxPerDay?: number,
): PlaceResult {
  const p = state.profile;
  let sessions = state.sessions.slice();
  const placed: Session[] = [];
  let unplaced = 0;
  if (!p || days.length === 0) return { sessions, placed, unplaced: chunks.reduce((a, b) => a + b, 0) };
  const preferLate = prefersLate(p, task);
  const range = TIME_RANGES[task.timeOfDay ?? 'cualquiera'];

  for (const chunk of chunks) {
    const scored = days
      .map((d, i) => {
        const load = plannedMinutes(sessions, d);
        const cap = capacity({ ...state, sessions }, d);
        const same = sessions.filter((s) => s.taskId === task.id && s.date === d).length;
        return {
          d,
          i,
          rem: cap - load,
          green: cap * GREEN - load, // margen antes de que el día deje de ser "tranquilo"
          same,
          ratio: (load + chunk) / Math.max(cap, 1),
        };
      })
      .filter((x) => maxPerDay == null || x.same < maxPerDay);

    const tryDays = (list: typeof scored): Session | null => {
      for (const x of list) {
        const start = findSlot(p, x.d, sessions, chunk, notBeforeFor(x.d, ctx), preferLate, range);
        if (start != null) {
          return { id: uid(), taskId: task.id, date: x.d, start, duration: chunk, status: 'planned' };
        }
      }
      return null;
    };

    // 1º: el día más cercano donde cabe y el día sigue siendo "verde" (empezar pronto, sin agobio)
    let s = tryDays(
      scored.filter((x) => x.green >= chunk).sort((a, b) => a.i + a.same * 3 - (b.i + b.same * 3)),
    );
    // 2º: donde quepa sin pasarse de la capacidad, el que más hueco tenga
    if (!s) s = tryDays(scored.filter((x) => x.rem >= chunk).sort((a, b) => b.rem - b.same * 120 - (a.rem - a.same * 120)));
    // 3º: si no cabe, el día menos cargado que tenga un hueco (el día se pondrá naranja/rojo)
    if (!s) s = tryDays([...scored].sort((a, b) => a.ratio - b.ratio || a.i - b.i));

    if (s) {
      sessions = [...sessions, s];
      placed.push(s);
    } else {
      unplaced += chunk;
    }
  }
  return { sessions, placed, unplaced };
}

// ---------------------------------------------------------------- tareas

export function doneMinutes(state: AppState, taskId: string): number {
  return state.sessions.reduce((a, s) => (s.taskId === taskId && s.status === 'done' ? a + s.duration : a), 0);
}

function flexibleWindow(task: Task, from: string): string[] {
  let last = addDays(from, NO_DEADLINE_HORIZON);
  if (task.deadline) last = task.deadline >= from ? task.deadline : from;
  return rangeDays(from, last);
}

/** Planifica los minutos que le falten a una tarea flexible a partir de `from`. */
export function replanMissing(state: AppState, taskId: string, from: string, ctx: Ctx): AppState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.kind !== 'flexible' || task.archived) return state;
  const planned = state.sessions.reduce(
    (a, s) => (s.taskId === taskId && s.status === 'planned' ? a + s.duration : a),
    0,
  );
  const missing = task.totalMinutes - doneMinutes(state, taskId) - planned;
  const unplaced = { ...state.unplaced };
  if (missing <= 0) {
    delete unplaced[taskId];
    return { ...state, unplaced };
  }
  const res = placeChunks(state, task, splitChunks(missing, task.sessionMinutes), flexibleWindow(task, from), ctx);
  if (res.unplaced > 0) unplaced[taskId] = res.unplaced;
  else delete unplaced[taskId];
  return { ...state, sessions: res.sessions, unplaced };
}

/** Asegura que cada hábito tenga sus N sesiones esta semana y la siguiente. */
export function ensureHabits(state: AppState, ctx: Ctx): AppState {
  let s = state;
  const ws0 = weekStart(ctx.today);
  for (const habit of s.tasks.filter((t) => t.kind === 'habito' && !t.archived)) {
    if (habit.timesPerMonth) {
      s = ensureMonthly(s, habit, ctx);
      continue;
    }
    for (const ws of [ws0, addDays(ws0, 7)]) {
      const we = addDays(ws, 6);
      const mine = s.sessions.filter((x) => x.taskId === habit.id && x.date >= ws && x.date <= we);
      const fixedDays = habit.days?.length ? habit.days : null;
      const target = fixedDays ? fixedDays.length : (habit.timesPerWeek ?? 1);
      const need = target - mine.length;
      if (need <= 0) continue;
      const from = ws < ctx.today ? ctx.today : ws;
      // días concretos: solo esos (y que aún no tengan su sesión); si no, cualquier día que quede
      const daysLeft = rangeDays(from, we).filter(
        (d) => !fixedDays || (fixedDays.includes(weekday(d)) && !mine.some((x) => x.date === d)),
      );
      // no repartimos lo que ya no da tiempo de la semana: proporcional a los días que quedan
      const fair = fixedDays ? Math.min(need, daysLeft.length) : ws === ws0 ? Math.min(need, Math.ceil((target * daysLeft.length) / 7)) : need;
      if (fair <= 0) continue;
      const res = placeChunks(s, habit, Array(fair).fill(habit.totalMinutes), daysLeft, ctx, 1);
      s = { ...s, sessions: res.sessions };
    }
  }
  return s;
}

/** Hábitos mensuales: N veces al mes, repartidas a lo largo del mes (este y el siguiente). */
function ensureMonthly(state: AppState, habit: Task, ctx: Ctx): AppState {
  let s = state;
  const thisMonth = `${ctx.today.slice(0, 7)}-01`;
  for (const ms of [thisMonth, addDays(monthEnd(thisMonth), 1)]) {
    const me = monthEnd(ms);
    const mine = s.sessions.filter((x) => x.taskId === habit.id && x.date >= ms && x.date <= me);
    const need = (habit.timesPerMonth ?? 1) - mine.length;
    if (need <= 0) continue;
    const days = rangeDays(ms < ctx.today ? ctx.today : ms, me).filter((d) => !mine.some((x) => x.date === d));
    if (!days.length) continue;
    // en el mes en curso, solo lo que da tiempo de forma razonable
    const fair = ms === thisMonth ? Math.min(need, Math.ceil(((habit.timesPerMonth ?? 1) * days.length) / rangeDays(ms, me).length)) : need;
    // un trozo de mes para cada vez, para que queden repartidas
    const size = Math.ceil(days.length / fair);
    for (let i = 0; i < fair; i++) {
      const seg = days.slice(i * size, (i + 1) * size);
      if (!seg.length) break;
      const res = placeChunks(s, habit, [habit.totalMinutes], seg, ctx, 1);
      s = { ...s, sessions: res.sessions };
    }
  }
  return s;
}

export interface NewTaskInput {
  title: string;
  category: Task['category'];
  kind: Task['kind'];
  totalMinutes: number;
  sessionMinutes?: number;
  deadline?: string;
  date?: string;
  start?: number;
  timesPerWeek?: number;
  routine?: boolean;
  timeOfDay?: TimeOfDay;
  icon?: string;
  days?: number[];
  timesPerMonth?: number;
}

export function addTask(state: AppState, input: NewTaskInput, ctx: Ctx): Result {
  const task: Task = {
    id: uid(),
    title: input.title.trim() || 'Sin título',
    category: input.category,
    kind: input.kind,
    totalMinutes: Math.max(5, Math.round(input.totalMinutes)),
    sessionMinutes: Math.max(15, Math.round(input.sessionMinutes ?? Math.min(60, input.totalMinutes))),
    deadline: input.kind === 'flexible' ? input.deadline : undefined,
    date: input.kind === 'evento' ? input.date : undefined,
    start: input.kind === 'evento' ? input.start : undefined,
    timesPerWeek: input.kind === 'habito' ? Math.max(1, Math.min(7, input.timesPerWeek ?? 1)) : undefined,
    routine: input.kind === 'habito' && input.routine ? true : undefined,
    timeOfDay: input.kind === 'habito' && input.timeOfDay && input.timeOfDay !== 'cualquiera' ? input.timeOfDay : undefined,
    days: input.kind === 'habito' && input.days?.length ? [...input.days].sort() : undefined,
    timesPerMonth: input.kind === 'habito' && input.timesPerMonth && !input.days?.length ? input.timesPerMonth : undefined,
    icon: input.icon,
    createdAt: ctx.today,
  };
  let s: AppState = { ...state, tasks: [...state.tasks, task] };

  if (task.kind === 'evento') {
    const ev: Session = {
      id: uid(),
      taskId: task.id,
      date: task.date ?? ctx.today,
      start: task.start ?? 18 * 60,
      duration: task.totalMinutes,
      status: 'planned',
      fixed: true,
    };
    s = { ...s, sessions: [...s.sessions, ev] };
    const { state: s2, note: extra } = resolveConflicts(s, ev, ctx);
    return { state: s2, message: `Apuntado ${fmtRelative(ev.date, ctx.today)} a las ${minToHm(ev.start)}.${extra}` };
  }

  if (task.kind === 'habito') {
    s = ensureHabits(s, ctx);
    const next = firstPlanned(s, task.id);
    return {
      state: s,
      message: next
        ? `${task.routine ? 'Cotidiana añadida' : 'Hábito creado'}: ${task.timesPerMonth ? `${task.timesPerMonth}× al mes` : task.timesPerWeek === 7 ? 'cada día' : `${task.timesPerWeek}× por semana`}. La primera vez, ${fmtRelative(next.date, ctx.today)} a las ${minToHm(next.start)}.`
        : 'Hábito creado. Esta semana ya no queda hueco, empezamos la que viene 🌱',
    };
  }

  s = replanMissing(s, task.id, ctx.today, ctx);
  const mine = s.sessions.filter((x) => x.taskId === task.id);
  const next = firstPlanned(s, task.id);
  const left = s.unplaced[task.id];
  let message = next
    ? mine.length === 1
      ? `Propuesta: ${fmtRelative(next.date, ctx.today)} a las ${minToHm(next.start)}.`
      : `Repartido en ${mine.length} sesiones. La primera, ${fmtRelative(next.date, ctx.today)} a las ${minToHm(next.start)}.`
    : 'No he encontrado hueco.';
  if (left) message += ` Ojo: faltan ${Math.round(left / 6) / 10} h que no caben antes del deadline.`;
  return { state: s, message };
}

export function firstPlanned(state: AppState, taskId: string, from?: string): Session | undefined {
  return state.sessions
    .filter((x) => x.taskId === taskId && x.status === 'planned' && (!from || x.date >= from))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)[0];
}

/** Si un evento fijo pisa sesiones flexibles, las recolocamos. */
function resolveConflicts(state: AppState, ev: Session, ctx: Ctx): { state: AppState; moved: number; note: string } {
  const clash = state.sessions.filter(
    (x) =>
      x.id !== ev.id &&
      x.date === ev.date &&
      !x.fixed &&
      x.status === 'planned' &&
      x.start < ev.start + ev.duration + BUFFER &&
      ev.start < x.start + x.duration + BUFFER,
  );
  if (!clash.length) return { state, moved: 0, note: '' };
  const ids = new Set(clash.map((c) => c.id));
  const from = ev.date < ctx.today ? ctx.today : ev.date;
  let s: AppState = { ...state, sessions: state.sessions.filter((x) => !ids.has(x.id)) };
  for (const c of clash) s = rehome(s, c, from, ctx);
  return { state: s, moved: clash.length, note: movedNote(state, s, clash, from, ctx) };
}

/** «Compra» → viernes 19:45, … (para que se entienda qué ha cambiado) */
function movedNote(before: AppState, after: AppState, moved: Session[], from: string, ctx: Ctx): string {
  const parts = [...new Set(moved.map((m) => m.taskId))].map((taskId) => {
    const t = before.tasks.find((x) => x.id === taskId);
    const next = firstPlanned(after, taskId, from);
    return next ? `«${t?.title}» ${fmtTo(next.date, ctx.today)} a las ${minToHm(next.start)}` : `«${t?.title}» (esta semana ya no cabe)`;
  });
  return parts.length ? ` Para hacerle sitio he movido ${parts.join(', ')}.` : '';
}

/** Recoloca una sesión ya retirada del estado a partir del día `from`. */
function rehome(state: AppState, removed: Session, from: string, ctx: Ctx): AppState {
  const task = state.tasks.find((t) => t.id === removed.taskId);
  if (!task) return state;
  if (task.kind === 'flexible') return replanMissing(state, task.id, from, ctx);
  if (task.kind === 'habito') {
    const we = addDays(weekStart(removed.date), 6);
    if (from > we) return state;
    const res = placeChunks(state, task, [removed.duration], rangeDays(from, we), ctx, 1);
    return { ...state, sessions: res.sessions };
  }
  return state;
}

// ---------------------------------------------------------------- acciones del día

export function completeSession(state: AppState, id: string): Result {
  const s0 = state.sessions.find((x) => x.id === id);
  if (!s0) return { state };
  const gained = 1 + Math.floor(s0.duration / 30);
  let sessions = state.sessions.map((x) =>
    x.id === id ? { ...x, status: 'done' as const, completedAt: new Date().toISOString() } : x,
  );
  let s: AppState = { ...state, sessions, drops: state.drops + gained };
  const task = s.tasks.find((t) => t.id === s0.taskId);
  if (task?.kind === 'flexible' && doneMinutes(s, task.id) >= task.totalMinutes) {
    // ¡objetivo cumplido! quitamos lo que quedara planificado
    sessions = s.sessions.filter((x) => !(x.taskId === task.id && x.status === 'planned'));
    const unplaced = { ...s.unplaced };
    delete unplaced[task.id];
    s = { ...s, sessions, unplaced };
    return { state: s, message: `🎉 ¡Has terminado «${task.title}»! +${gained} gotas` };
  }
  return { state: s, message: `+${gained} gotas 💧` };
}

export function uncompleteSession(state: AppState, id: string): Result {
  const s0 = state.sessions.find((x) => x.id === id);
  if (!s0 || s0.status !== 'done') return { state };
  const lost = 1 + Math.floor(s0.duration / 30);
  return {
    state: {
      ...state,
      drops: Math.max(0, state.drops - lost),
      sessions: state.sessions.map((x) => (x.id === id ? { ...x, status: 'planned' as const, completedAt: undefined } : x)),
    },
  };
}

/** "Hoy no puedo": la sesión vuelve a la bolsa y se recoloca a partir de mañana. */
export function postponeSession(state: AppState, id: string, ctx: Ctx): Result {
  const s0 = state.sessions.find((x) => x.id === id);
  if (!s0) return { state };
  const task = state.tasks.find((t) => t.id === s0.taskId);
  let s: AppState = { ...state, sessions: state.sessions.filter((x) => x.id !== id) };
  if (!task || task.kind === 'evento') return { state: s, message: 'Evento quitado del calendario.' };
  const from = addDays(s0.date < ctx.today ? ctx.today : s0.date, 1);
  s = rehome(s, s0, from, ctx);
  const next = firstPlanned(s, task.id, from);
  if (!next) {
    return {
      state: s,
      message:
        task.kind === 'habito'
          ? 'Esta semana ya no hay hueco. No pasa nada: la semana que viene volvemos 🌿'
          : 'No encuentro hueco antes del deadline. ¿Ampliamos la fecha?',
    };
  }
  return { state: s, message: `Sin culpa 🌿 Lo he movido ${fmtTo(next.date, ctx.today)} a las ${minToHm(next.start)}.` };
}

/** Si la energía del día baja, quitamos peso moviendo lo que tenga margen. */
export function lightenDay(state: AppState, date: string, ctx: Ctx): { state: AppState; moved: number } {
  let s = state;
  let moved = 0;
  for (let guard = 0; guard < 20; guard++) {
    if (plannedMinutes(s.sessions, date) <= capacity(s, date)) break;
    const candidates = sessionsOn(s.sessions, date)
      .filter((x) => x.status === 'planned' && !x.fixed && !x.pinned)
      .map((x) => ({ x, task: s.tasks.find((t) => t.id === x.taskId) }))
      .filter(({ task }) => task && (task.kind === 'habito' || !task.deadline || task.deadline > date))
      .sort((a, b) => (b.task?.deadline ?? '9999').localeCompare(a.task?.deadline ?? '9999'));
    const pick = candidates[0];
    if (!pick) break;
    s = { ...s, sessions: s.sessions.filter((x) => x.id !== pick.x.id) };
    s = rehome(s, pick.x, addDays(date, 1), ctx);
    moved++;
  }
  return { state: s, moved };
}

export function setEnergy(state: AppState, date: string, value: number, ctx: Ctx): Result {
  let s: AppState = { ...state, energy: { ...state.energy, [date]: value } };
  const { state: s2, moved } = lightenDay(s, date, ctx);
  s = s2;
  let message: string;
  if (value <= 40) {
    message = moved
      ? `Gracias por escucharte 💛 He aligerado tu día: ${moved} ${moved === 1 ? 'cosa pasa' : 'cosas pasan'} a otros días.`
      : 'Gracias por escucharte 💛 Hoy, lo justo y con calma.';
  } else if (value >= 80) {
    message = '¡Qué buena energía! Si te sobra un rato, puedes adelantar algo ✨';
  } else {
    message = moved ? `He reajustado tu día (${moved} movidas).` : 'Perfecto, tu día está equilibrado 🌿';
  }
  return { state: s, message };
}

/** "Tengo un hueco": trae a hoy la siguiente sesión flexible más urgente. */
export function pullForward(state: AppState, ctx: Ctx): Result {
  const p = state.profile;
  if (!p) return { state };
  const future = state.sessions
    .filter((x) => x.status === 'planned' && !x.fixed && !x.pinned && x.date > ctx.today)
    .map((x) => ({ x, task: state.tasks.find((t) => t.id === x.taskId) }))
    .filter(({ task }) => task?.kind === 'flexible')
    .sort(
      (a, b) =>
        (a.task?.deadline ?? '9999').localeCompare(b.task?.deadline ?? '9999') ||
        a.x.date.localeCompare(b.x.date),
    );
  for (const { x, task } of future) {
    const others = state.sessions.filter((o) => o.id !== x.id);
    const start = findSlot(p, ctx.today, others, x.duration, notBeforeFor(ctx.today, ctx));
    if (start != null) {
      return {
        state: { ...state, sessions: [...others, { ...x, date: ctx.today, start }] },
        message: `Adelantado: «${task?.title}» hoy a las ${minToHm(start)} ✨`,
      };
    }
  }
  return { state, message: 'Ahora mismo no hay nada que adelantar que quepa hoy. ¡Disfruta del rato libre! 🌿' };
}

export function archiveTask(state: AppState, taskId: string): AppState {
  const unplaced = { ...state.unplaced };
  delete unplaced[taskId];
  return {
    ...state,
    tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, archived: true } : t)),
    sessions: state.sessions.filter((x) => !(x.taskId === taskId && x.status === 'planned')),
    unplaced,
  };
}

/** Al abrir la app un día nuevo: lo no hecho de días pasados vuelve a planificarse. */
const FOCUS: Task['category'][] = ['proyectos', 'trabajo'];
const RECHARGE: Task['category'][] = ['bienestar', 'autocuidado', 'social'];

/** Resumen de un día a partir de sus sesiones (antes de recolocar lo no hecho) */
export function recordDay(state: AppState, date: string): DayRecord {
  const cat = new Map(state.tasks.map((t) => [t.id, t.category]));
  const day = sessionsOn(state.sessions, date);
  const focus = day.filter((x) => FOCUS.includes(cat.get(x.taskId)!));
  const am = (x: Session) => x.start < 14 * 60;
  return {
    energy: energyFor(state, date),
    planned: day.length,
    done: day.filter((x) => x.status === 'done').length,
    focusPlanned: focus.length,
    focusDone: focus.filter((x) => x.status === 'done').length,
    focusPlannedAm: focus.filter(am).length,
    focusPlannedPm: focus.filter((x) => !am(x)).length,
    focusDoneAm: focus.filter((x) => x.status === 'done' && am(x)).length,
    focusDonePm: focus.filter((x) => x.status === 'done' && !am(x)).length,
    rechargeMinutes: day.filter((x) => x.status === 'done' && RECHARGE.includes(cat.get(x.taskId)!)).reduce((a, x) => a + x.duration, 0),
  };
}

export function rollover(state: AppState, ctx: Ctx): { state: AppState; moved: number } {
  // antes de recolocar nada, guardamos cómo fueron los días que han pasado
  const history = { ...(state.history ?? {}) };
  const firstDay = addDays(ctx.today, -30);
  for (const d of new Set(state.sessions.filter((x) => x.date < ctx.today && x.date >= firstDay).map((x) => x.date))) {
    if (!history[d]) history[d] = recordDay(state, d);
  }
  state = { ...state, history };
  const overdue = state.sessions.filter((x) => x.status === 'planned' && !x.fixed && x.date < ctx.today);
  const ids = new Set(overdue.map((x) => x.id));
  let s: AppState = { ...state, sessions: state.sessions.filter((x) => !ids.has(x.id)), lastOpen: ctx.today };
  const flexIds = [...new Set(overdue.map((x) => x.taskId))].filter(
    (id) => s.tasks.find((t) => t.id === id)?.kind === 'flexible',
  );
  for (const id of sortByUrgency(s, flexIds)) s = replanMissing(s, id, ctx.today, ctx);
  s = ensureHabits(s, ctx);
  const moved = overdue.filter((x) => flexIds.includes(x.taskId)).length;
  return { state: s, moved };
}

function sortByUrgency(state: AppState, ids: string[]): string[] {
  const dl = (id: string) => state.tasks.find((t) => t.id === id)?.deadline ?? '9999';
  return [...ids].sort((a, b) => dl(a).localeCompare(dl(b)));
}

/** Vuelve a colocar todo lo pendiente desde cero (p. ej. al cambiar el horario). */
export function replanAll(state: AppState, ctx: Ctx): AppState {
  let s: AppState = {
    ...state,
    sessions: state.sessions.filter((x) => x.status === 'done' || x.fixed || (x.pinned && x.date >= ctx.today)),
    unplaced: {},
  };
  s = ensureHabits(s, ctx);
  const flex = s.tasks.filter((t) => t.kind === 'flexible' && !t.archived).map((t) => t.id);
  for (const id of sortByUrgency(s, flex)) s = replanMissing(s, id, ctx.today, ctx);
  return s;
}

// ---------------------------------------------------------------- edición manual

/** Mover una sesión a mano: queda "fijada" y el planificador la respeta. */
export function moveSession(state: AppState, id: string, date: string, start: number, ctx: Ctx): Result {
  const s0 = state.sessions.find((x) => x.id === id);
  if (!s0) return { state };
  const task = state.tasks.find((t) => t.id === s0.taskId);
  const moved: Session = { ...s0, date, start, pinned: !s0.fixed, status: s0.status };
  const others = state.sessions.filter((x) => x.id !== id);
  let s: AppState = { ...state, sessions: [...others, moved] };
  if (task?.kind === 'evento') {
    s = { ...s, tasks: s.tasks.map((t) => (t.id === task.id ? { ...t, date, start } : t)) };
  }
  const clash = others.find(
    (x) => x.date === date && x.start < start + moved.duration && start < x.start + x.duration,
  );
  const p = s.profile;
  const inBusy =
    p && baseBusy(p, date).some((b) => b.start < start + moved.duration && start < b.end && b.start > 0 && b.end < 1440);
  let message = `Movido ${fmtTo(date, ctx.today)} a las ${minToHm(start)} 📌`;
  if (clash) {
    const other = s.tasks.find((t) => t.id === clash.taskId);
    message += ` Ojo: coincide con «${other?.title ?? 'otra cosa'}».`;
  } else if (inBusy) message += ' Ojo: cae en tu horario de trabajo o comidas.';
  if (task?.deadline && date > task.deadline) message += ' Queda después de la fecha límite.';
  return { state: s, message };
}

export interface TaskPatch {
  title?: string;
  category?: Task['category'];
  totalMinutes?: number;
  sessionMinutes?: number;
  deadline?: string | null;
  date?: string;
  start?: number;
  timesPerWeek?: number;
  timeOfDay?: TimeOfDay;
  /** null = sin días concretos */
  days?: number[] | null;
  /** null = no es mensual */
  timesPerMonth?: number | null;
  icon?: string;
}

/** Editar una tarea. Si cambia algo de planificación, se recoloca lo pendiente. */
export function editTask(state: AppState, taskId: string, patch: TaskPatch, ctx: Ctx): Result {
  const old = state.tasks.find((t) => t.id === taskId);
  if (!old) return { state };
  const task: Task = {
    ...old,
    title: patch.title?.trim() || old.title,
    category: patch.category ?? old.category,
    totalMinutes: Math.max(5, Math.round(patch.totalMinutes ?? old.totalMinutes)),
    sessionMinutes: Math.max(15, Math.round(patch.sessionMinutes ?? old.sessionMinutes)),
    deadline: patch.deadline === null ? undefined : (patch.deadline ?? old.deadline),
    date: patch.date ?? old.date,
    start: patch.start ?? old.start,
    timesPerWeek: patch.timesPerWeek ?? old.timesPerWeek,
    timeOfDay: patch.timeOfDay ? (patch.timeOfDay === 'cualquiera' ? undefined : patch.timeOfDay) : old.timeOfDay,
    days: patch.days === null ? undefined : patch.days?.length ? [...patch.days].sort() : old.days,
    timesPerMonth: patch.timesPerMonth === null ? undefined : (patch.timesPerMonth ?? old.timesPerMonth),
    icon: patch.icon ?? old.icon,
  };
  let s: AppState = { ...state, tasks: state.tasks.map((t) => (t.id === taskId ? task : t)) };
  const changed = (k: keyof Task) => task[k] !== old[k];

  if (task.kind === 'evento') {
    const ev = s.sessions.find((x) => x.taskId === taskId && x.fixed);
    if (ev && (changed('date') || changed('start') || changed('totalMinutes'))) {
      const nev = { ...ev, date: task.date ?? ev.date, start: task.start ?? ev.start, duration: task.totalMinutes };
      s = { ...s, sessions: s.sessions.map((x) => (x.id === ev.id ? nev : x)) };
      s = resolveConflicts(s, nev, ctx).state;
    }
    return { state: s, message: 'Guardado ✨' };
  }

  if (
    task.kind === 'habito' &&
    (changed('timesPerWeek') || changed('timesPerMonth') || changed('totalMinutes') || changed('timeOfDay') || JSON.stringify(task.days) !== JSON.stringify(old.days))
  ) {
    s = {
      ...s,
      sessions: s.sessions.filter((x) => !(x.taskId === taskId && x.status === 'planned' && x.date >= ctx.today)),
    };
    s = ensureHabits(s, ctx);
    return { state: s, message: task.routine ? 'Cotidiana actualizada y recolocada 🔁' : 'Hábito actualizado y recolocado 🔁' };
  }

  if (
    task.kind === 'flexible' &&
    (changed('totalMinutes') || changed('sessionMinutes') || changed('deadline'))
  ) {
    s = {
      ...s,
      sessions: s.sessions.filter((x) => !(x.taskId === taskId && x.status === 'planned' && !x.pinned)),
    };
    s = replanMissing(s, taskId, ctx.today, ctx);
    const next = firstPlanned(s, taskId, ctx.today);
    if (doneMinutes(s, taskId) >= task.totalMinutes) {
      s = { ...s, sessions: s.sessions.filter((x) => !(x.taskId === taskId && x.status === 'planned')) };
      return { state: s, message: '¡Con este cambio ya está conseguido! 🏆' };
    }
    return {
      state: s,
      message: next
        ? `Recolocado. Lo siguiente: ${fmtRelative(next.date, ctx.today)} a las ${minToHm(next.start)}.`
        : 'Guardado, pero no encuentro hueco antes de la fecha límite.',
    };
  }
  return { state: s, message: 'Guardado ✨' };
}

// ---------------------------------------------------------------- calendario externo

export interface ExternalEvent {
  uid: string;
  title: string;
  date: string;
  start: number;
  duration: number;
}

/**
 * Importa citas de otro calendario (.ics o calendario del iPhone) como eventos fijos.
 * Las que ya existían se actualizan; lo flexible que pisen se recoloca.
 */
export function importEvents(
  state: AppState,
  events: ExternalEvent[],
  source: 'ics' | 'ios',
  ctx: Ctx,
  guessCategory: (title: string) => Task['category'],
): Result {
  let s = state;
  let added = 0;
  let moved = 0;
  for (const e of events) {
    if (e.date < ctx.today || e.duration <= 0) continue;
    const externalId = `${e.uid}@${e.date}`;
    const existing = s.tasks.find((t) => t.externalId === externalId && !t.archived);
    if (existing) {
      const ev = s.sessions.find((x) => x.taskId === existing.id);
      if (ev && (ev.start !== e.start || ev.duration !== e.duration)) {
        s = editTask(s, existing.id, { start: e.start, totalMinutes: e.duration }, ctx).state;
      }
      continue;
    }
    const task: Task = {
      id: uid(),
      title: e.title || 'Cita',
      category: guessCategory(e.title),
      kind: 'evento',
      totalMinutes: Math.min(e.duration, 1440 - e.start),
      sessionMinutes: e.duration,
      date: e.date,
      start: e.start,
      createdAt: ctx.today,
      source,
      externalId,
    };
    const ev: Session = {
      id: uid(),
      taskId: task.id,
      date: e.date,
      start: e.start,
      duration: task.totalMinutes,
      status: 'planned',
      fixed: true,
    };
    s = { ...s, tasks: [...s.tasks, task], sessions: [...s.sessions, ev] };
    const r = resolveConflicts(s, ev, ctx);
    s = r.state;
    moved += r.moved;
    added++;
  }
  const extra = moved ? ` He recolocado ${moved} ${moved === 1 ? 'sesión' : 'sesiones'} que coincidían.` : '';
  return {
    state: s,
    message: added ? `He traído ${added} ${added === 1 ? 'cita' : 'citas'} de tu calendario 📅.${extra}` : 'Tu calendario ya estaba al día 📅',
  };
}

// ---------------------------------------------------------------- presupuesto del día (lo que ve el usuario)

export interface DayBudget {
  /** tiempo libre real: el día menos sueño, rutina, trabajo, comidas y desconexión */
  free: number;
  /** lo que te recomiendo usar como mucho, según tu energía */
  recommended: number;
  /** minutos con cosas (hechas o pendientes) dentro de tu tiempo libre */
  used: number;
  done: number;
  pending: number;
  /** lo que queda libre de verdad */
  left: number;
  energy: number;
  level: Level;
}

function overlap(a: Interval, b: Interval): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

export function dayBudget(state: AppState, date: string): DayBudget {
  const p = state.profile!;
  const free = complement(baseBusy(p, date));
  const inFree = (s: Session) => free.reduce((a, w) => a + overlap(w, { start: s.start, end: s.start + s.duration }), 0);
  const day = sessionsOn(state.sessions, date);
  const done = day.filter((x) => x.status === 'done').reduce((a, x) => a + inFree(x), 0);
  const pending = day.filter((x) => x.status === 'planned').reduce((a, x) => a + inFree(x), 0);
  const freeMin = free.reduce((a, w) => a + w.end - w.start, 0);
  return {
    free: freeMin,
    recommended: capacity(state, date),
    used: done + pending,
    done,
    pending,
    left: Math.max(0, freeMin - done - pending),
    energy: energyFor(state, date),
    level: dayLoad(state, date).level,
  };
}

// ---------------------------------------------------------------- pausas del día (teletrabajo)

/** Guarda las pausas de un día y coloca en ellas lo corto que encaje (meditar, estirar…). */
export function setDayBreaks(state: AppState, date: string, breaks: WorkBreak[], ctx: Ctx): Result {
  const p = state.profile;
  if (!p) return { state };
  let s: AppState = {
    ...state,
    profile: {
      ...p,
      breaksOn: Object.fromEntries(
        Object.entries({ ...(p.breaksOn ?? {}), [date]: breaks }).filter(([d]) => d >= addDays(ctx.today, -7)),
      ),
    },
  };
  const r = fillBreaks(s, date, ctx);
  s = r.state;
  return { state: s, message: r.message ?? (breaks.length ? 'Pausas guardadas ☕' : 'Hoy sin pausas, entendido.') };
}

/** Mueve a las pausas libres de ese día las sesiones cortas que quepan (prioriza bienestar). */
export function fillBreaks(state: AppState, date: string, ctx: Ctx): Result {
  const p = state.profile;
  if (!p) return { state };
  let s = state;
  const placed: string[] = [];
  const weight = (c: Task['category']) => (c === 'bienestar' ? 0 : c === 'autocuidado' ? 1 : 2);
  for (const b of breaksFor(p, date)) {
    if (date === ctx.today && b.start < ctx.now) continue;
    const taken = s.sessions.some((x) => x.date === date && x.start < b.start + b.duration && b.start < x.start + x.duration);
    if (taken) continue;
    const ws = weekStart(date);
    const we = addDays(ws, 6);
    const candidates = s.sessions
      .filter((x) => x.status === 'planned' && !x.fixed && !x.pinned && x.duration <= b.duration && x.date >= ctx.today && x.date <= we)
      .map((x) => ({ x, t: s.tasks.find((t) => t.id === x.taskId)! }))
      .filter(({ x, t }) => t && (x.date === date || t.kind === 'habito') && (!t.timeOfDay || t.timeOfDay === 'cualquiera' || overlap(TIME_RANGES[t.timeOfDay], { start: b.start, end: b.start + b.duration }) > 0))
      // un hábito solo una vez por día
      .filter(({ x, t }) => x.date === date || !s.sessions.some((o) => o.taskId === t.id && o.date === date))
      .sort((a, z) => weight(a.t.category) - weight(z.t.category) || (a.x.date === date ? -1 : 1));
    const pick = candidates[0];
    if (!pick) continue;
    s = { ...s, sessions: s.sessions.map((x) => (x.id === pick.x.id ? { ...x, date, start: b.start } : x)) };
    placed.push(`«${pick.t.title}» a las ${minToHm(b.start)}`);
  }
  return {
    state: s,
    message: placed.length ? `He puesto ${placed.join(' y ')} en tus pausas ☕` : undefined,
  };
}

// ---------------------------------------------------------------- progreso de un proyecto

export interface ProjectStatus {
  done: number;
  total: number;
  pct: number;
  /** % que "tocaría" llevar hoy si se avanza a ritmo constante */
  expected: number | null;
  sessionsDone: number;
  sessionsLeft: number;
  next?: Session;
  phrase: string;
  stage: string;
  mood: 'done' | 'start' | 'ahead' | 'ontrack' | 'behind' | 'risk' | 'free';
  /** minutos hechos por semana (últimas 6 semanas, de la más antigua a la actual) */
  weekly: { week: string; minutes: number }[];
}

const STAGES = ['🌰', '🌱', '🌿', '🪴', '🌳'];

export function projectStatus(state: AppState, taskId: string, today: string): ProjectStatus {
  const task = state.tasks.find((t) => t.id === taskId)!;
  const mine = state.sessions.filter((x) => x.taskId === taskId);
  const done = doneMinutes(state, taskId);
  const pct = Math.min(1, done / Math.max(1, task.totalMinutes));
  let expected: number | null = null;
  if (task.deadline) {
    const span = Math.max(1, (Date.parse(task.deadline) - Date.parse(task.createdAt)) / 86400000 + 1);
    const elapsed = Math.max(0, (Date.parse(today) - Date.parse(task.createdAt)) / 86400000);
    expected = Math.min(1, elapsed / span);
  }
  const left = state.unplaced[taskId] ?? 0;
  let mood: ProjectStatus['mood'];
  let phrase: string;
  if (pct >= 1) {
    mood = 'done';
    phrase = '¡Conseguido! Mira todo lo que has construido, sesión a sesión 🏆';
  } else if (done === 0) {
    mood = 'start';
    phrase = 'Todo gran proyecto empieza con una primera sesión. La tuya ya tiene hueco.';
  } else if (left > 0) {
    mood = 'risk';
    phrase = 'Así no llega a tiempo. ¿Ampliamos la fecha o reducimos horas? Sin presión, lo ajustamos.';
  } else if (expected == null) {
    mood = 'free';
    phrase = pct < 0.25 ? 'Arrancando: ya has plantado la semilla 🌱' : pct < 0.5 ? 'Echando raíces. La constancia hace el resto.' : pct < 0.75 ? 'Creciendo fuerte. Ya has pasado la mitad 💪' : '¡Ya casi lo tienes! El último empujón.';
  } else if (pct >= expected + 0.1) {
    mood = 'ahead';
    phrase = '¡Vas por delante del plan! Puedes ir con calma 🌿';
  } else if (pct >= expected - 0.1) {
    mood = 'ontrack';
    phrase = 'Vas a buen ritmo. Paso a paso llegas de sobra.';
  } else {
    mood = 'behind';
    phrase = 'Vas un poco por detrás, pero el plan cuadra. Una sesión cada vez.';
  }
  const ws = weekStart(today);
  const weekly = Array.from({ length: 6 }, (_, i) => {
    const w = addDays(ws, -7 * (5 - i));
    const we = addDays(w, 6);
    return { week: w, minutes: mine.filter((x) => x.status === 'done' && x.date >= w && x.date <= we).reduce((a, x) => a + x.duration, 0) };
  });
  return {
    done,
    total: task.totalMinutes,
    pct,
    expected,
    sessionsDone: mine.filter((x) => x.status === 'done').length,
    sessionsLeft: mine.filter((x) => x.status === 'planned').length,
    next: firstPlanned(state, taskId, today),
    phrase,
    stage: STAGES[Math.min(4, Math.floor(pct * 4))],
    mood,
    weekly,
  };
}

// ---------------------------------------------------------------- recarga antes del foco

/**
 * Reserva 10 minutos de recarga (respirar, pasear) justo antes de una sesión de foco.
 * Usa el margen que ya hay antes de cada sesión; si no cabe, busca otro hueco ese día.
 */
export function addRechargeBefore(state: AppState, sessionId: string, ctx: Ctx): Result {
  const target = state.sessions.find((x) => x.id === sessionId);
  const p = state.profile;
  if (!target || !p) return { state };
  const focusTask = state.tasks.find((t) => t.id === target.taskId);
  const task: Task = {
    id: uid(),
    title: `Recarga antes de «${focusTask?.title ?? 'tu sesión'}»`,
    category: 'bienestar',
    kind: 'flexible',
    totalMinutes: 10,
    sessionMinutes: 10,
    deadline: target.date,
    icon: '🫧',
    createdAt: ctx.today,
  };
  const start = target.start - 10;
  const others = state.sessions.filter((x) => x.date === target.date && x.id !== target.id);
  const clash = others.some((x) => x.start < target.start && start < x.start + x.duration);
  const busy = baseBusy(p, target.date).some((b) => b.start < target.start && start < b.end);
  const past = target.date === ctx.today && start < ctx.now;
  let s: AppState = { ...state, tasks: [...state.tasks, task] };
  if (!clash && !busy && !past) {
    const session: Session = { id: uid(), taskId: task.id, date: target.date, start, duration: 10, status: 'planned', pinned: true };
    s = { ...s, sessions: [...s.sessions, session] };
    return { state: s, message: `🫧 10 min de recarga a las ${minToHm(start)}, justo antes de «${focusTask?.title}». Llegarás con la cabeza más clara.` };
  }
  // plan B: el hueco libre más cercano ANTES de la sesión; si no hay, cualquiera de ese día
  const windows = freeWindows(p, target.date, state.sessions, target.date === ctx.today ? ceilTo(ctx.now + 5, STEP) : 0);
  const before = windows
    .map((w) => ({ start: Math.min(w.end, target.start) - 10, w }))
    .filter(({ start: st, w }) => st >= w.start)
    .sort((x, y) => y.start - x.start)[0];
  if (before) {
    const session: Session = { id: uid(), taskId: task.id, date: target.date, start: before.start, duration: 10, status: 'planned', pinned: true };
    s = { ...s, sessions: [...s.sessions, session] };
    return { state: s, message: `🫧 Justo antes no cabía: he reservado 10 min de recarga a las ${minToHm(before.start)}, antes de «${focusTask?.title}».` };
  }
  s = replanMissing(s, task.id, target.date, ctx);
  const placed = firstPlanned(s, task.id);
  return {
    state: s,
    message: placed ? `🫧 He reservado 10 min de recarga a las ${minToHm(placed.start)}.` : 'Hoy no queda hueco para la recarga. Prueba a respirar un minuto antes de empezar 🫧',
  };
}
