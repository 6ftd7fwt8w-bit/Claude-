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
import type { AppState, Profile, Session, Task } from '../types';
import { addDays, ceilTo, fmtRelative, minToHm, rangeDays, weekStart, weekday } from './time';

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

export function baseBusy(p: Profile, date: string): Interval[] {
  const busy: Interval[] = [{ start: 0, end: p.wake + p.morningRoutine }];
  if (isWorkDay(p, date)) busy.push({ start: p.workStart - p.commute, end: p.workEnd + p.commute });
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

export function findSlot(
  p: Profile,
  date: string,
  sessions: Session[],
  duration: number,
  notBefore = 0,
  preferLate = false,
): number | null {
  const windows = freeWindows(p, date, sessions, notBefore);
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
  const preferLate = task.category === 'social' || task.category === 'autocuidado';

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
        const start = findSlot(p, x.d, sessions, chunk, notBeforeFor(x.d, ctx), preferLate);
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
    for (const ws of [ws0, addDays(ws0, 7)]) {
      const we = addDays(ws, 6);
      const count = s.sessions.filter((x) => x.taskId === habit.id && x.date >= ws && x.date <= we).length;
      const need = (habit.timesPerWeek ?? 1) - count;
      if (need <= 0) continue;
      const from = ws < ctx.today ? ctx.today : ws;
      // no repartimos lo que ya no da tiempo de la semana: proporcional a los días que quedan
      const daysLeft = rangeDays(from, we);
      const fair = ws === ws0 ? Math.min(need, Math.ceil(((habit.timesPerWeek ?? 1) * daysLeft.length) / 7)) : need;
      if (fair <= 0) continue;
      const res = placeChunks(s, habit, Array(fair).fill(habit.totalMinutes), daysLeft, ctx, 1);
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
    timesPerWeek: input.kind === 'habito' ? Math.max(1, input.timesPerWeek ?? 1) : undefined,
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
    const { state: s2, moved } = resolveConflicts(s, ev, ctx);
    const extra = moved > 0 ? ` He movido ${moved} ${moved === 1 ? 'cosa' : 'cosas'} para hacerle sitio.` : '';
    return { state: s2, message: `Apuntado ${fmtRelative(ev.date, ctx.today)} a las ${minToHm(ev.start)}.${extra}` };
  }

  if (task.kind === 'habito') {
    s = ensureHabits(s, ctx);
    const next = firstPlanned(s, task.id);
    return {
      state: s,
      message: next
        ? `Hábito creado: ${task.timesPerWeek}× por semana. La primera vez, ${fmtRelative(next.date, ctx.today)} a las ${minToHm(next.start)}.`
        : 'Hábito creado. Esta semana ya no queda hueco, empezamos la que viene 🌱',
    };
  }

  s = replanMissing(s, task.id, ctx.today, ctx);
  const mine = s.sessions.filter((x) => x.taskId === task.id);
  const next = firstPlanned(s, task.id);
  const left = s.unplaced[task.id];
  let message = next
    ? `Repartido en ${mine.length} ${mine.length === 1 ? 'sesión' : 'sesiones'}. Propuesta: ${fmtRelative(next.date, ctx.today)} a las ${minToHm(next.start)}.`
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
function resolveConflicts(state: AppState, ev: Session, ctx: Ctx): { state: AppState; moved: number } {
  const clash = state.sessions.filter(
    (x) =>
      x.id !== ev.id &&
      x.date === ev.date &&
      !x.fixed &&
      x.status === 'planned' &&
      x.start < ev.start + ev.duration + BUFFER &&
      ev.start < x.start + x.duration + BUFFER,
  );
  if (!clash.length) return { state, moved: 0 };
  const ids = new Set(clash.map((c) => c.id));
  let s: AppState = { ...state, sessions: state.sessions.filter((x) => !ids.has(x.id)) };
  for (const c of clash) s = rehome(s, c, ev.date < ctx.today ? ctx.today : ev.date, ctx);
  return { state: s, moved: clash.length };
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
  return { state: s, message: `Sin culpa 🌿 Lo he movido a ${fmtRelative(next.date, ctx.today)} a las ${minToHm(next.start)}.` };
}

/** Si la energía del día baja, quitamos peso moviendo lo que tenga margen. */
export function lightenDay(state: AppState, date: string, ctx: Ctx): { state: AppState; moved: number } {
  let s = state;
  let moved = 0;
  for (let guard = 0; guard < 20; guard++) {
    if (plannedMinutes(s.sessions, date) <= capacity(s, date)) break;
    const candidates = sessionsOn(s.sessions, date)
      .filter((x) => x.status === 'planned' && !x.fixed)
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
    .filter((x) => x.status === 'planned' && !x.fixed && x.date > ctx.today)
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
export function rollover(state: AppState, ctx: Ctx): { state: AppState; moved: number } {
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
    sessions: state.sessions.filter((x) => x.status === 'done' || x.fixed),
    unplaced: {},
  };
  s = ensureHabits(s, ctx);
  const flex = s.tasks.filter((t) => t.kind === 'flexible' && !t.archived).map((t) => t.id);
  for (const id of sortByUrgency(s, flex)) s = replanMissing(s, id, ctx.today, ctx);
  return s;
}
