import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, emptyState, type AppState } from '../types';
import { addTask, baseFreeMinutes, completeSession, dayBudget, projectStatus, setDayBreaks, type Ctx } from './scheduler';
import { addDays } from './time';

const TODAY = '2026-11-26'; // jueves
const ctx: Ctx = { today: TODAY, now: 8 * 60 };
const base = (patch = {}): AppState => ({
  ...emptyState(),
  profile: { ...DEFAULT_PROFILE, name: 'T', createdAt: TODAY, ...patch },
});

describe('teletrabajo y pausas', () => {
  it('en teletrabajo no hay desplazamiento y las pausas son huecos', () => {
    const office = baseFreeMinutes(base().profile!, TODAY);
    const remote = base({ remoteDays: [4], breaks: [{ start: 11 * 60, duration: 15 }] }).profile!;
    expect(baseFreeMinutes(remote, TODAY)).toBe(office + 60 + 15);
  });

  it('una cosa corta cabe en la pausa; una larga no', () => {
    const s0 = base({ remoteDays: [4], breaks: [{ start: 11 * 60, duration: 15 }], wake: 8 * 60, morningRoutine: 60 });
    // ocupamos la tarde para que la pausa sea el único hueco útil de hoy
    let { state } = addTask(s0, { title: 'Meditar', category: 'bienestar', kind: 'flexible', totalMinutes: 10, sessionMinutes: 15, deadline: TODAY }, { today: TODAY, now: 9 * 60 });
    expect(state.sessions[0]).toMatchObject({ date: TODAY, start: 11 * 60 });
    ({ state } = addTask(state, { title: 'Proyecto', category: 'proyectos', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60, deadline: TODAY }, { today: TODAY, now: 9 * 60 }));
    const proj = state.sessions.find((x) => x.duration === 60)!;
    expect(proj.start).toBeGreaterThanOrEqual(18 * 60);
  });

  it('al marcar pausas hoy, coloca ahí lo corto de bienestar', () => {
    let { state } = addTask(base({ remoteDays: [4] }), { title: 'Meditar', category: 'bienestar', kind: 'habito', totalMinutes: 10, timesPerWeek: 7 }, ctx);
    const before = state.sessions.find((x) => x.date === TODAY)!;
    expect(before.start).not.toBe(11 * 60);
    const r = setDayBreaks(state, TODAY, [{ start: 11 * 60, duration: 15 }], ctx);
    expect(r.state.sessions.find((x) => x.id === before.id)!.start).toBe(11 * 60);
    expect(r.message).toMatch(/pausas/);
  });
});

describe('momento del día', () => {
  it('una cotidiana de noche se coloca por la noche', () => {
    const sat: Ctx = { today: '2026-11-28', now: 7 * 60 };
    const { state } = addTask(base(), { title: 'Ducha', category: 'autocuidado', kind: 'habito', totalMinutes: 15, timesPerWeek: 7, routine: true, timeOfDay: 'noche', icon: '🚿' }, sat);
    expect(state.tasks[0]).toMatchObject({ routine: true, timeOfDay: 'noche', icon: '🚿' });
    for (const x of state.sessions) expect(x.start).toBeGreaterThanOrEqual(19 * 60);
  });
});

describe('horas claras', () => {
  it('el presupuesto cuadra: libre = usado + queda', () => {
    let { state } = addTask(base(), { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60, deadline: TODAY }, ctx);
    state = addTask(state, { title: 'Dentista', category: 'autocuidado', kind: 'evento', totalMinutes: 60, date: TODAY, start: 10 * 60 }, ctx).state; // en horario de trabajo
    const b = dayBudget(state, TODAY);
    expect(b.free).toBe(225);
    expect(b.used).toBe(60); // la cita del dentista cae en horas de trabajo: no resta tiempo libre
    expect(b.left).toBe(165);
  });

  it('al añadir una cita se explica qué se ha movido y adónde', () => {
    let { state } = addTask(base(), { title: 'Compra', category: 'hogar', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60, deadline: addDays(TODAY, 3) }, ctx);
    const s0 = state.sessions[0];
    const r = addTask(state, { title: 'Cena', category: 'social', kind: 'evento', totalMinutes: 60, date: s0.date, start: s0.start }, ctx);
    expect(r.message).toMatch(/he movido «Compra» (al|a) .+ a las \d\d:\d\d/);
  });
});

describe('progreso del proyecto', () => {
  it('frase y etapa según el avance', () => {
    let { state } = addTask(base(), { title: 'Web', category: 'proyectos', kind: 'flexible', totalMinutes: 240, sessionMinutes: 60, deadline: addDays(TODAY, 20) }, ctx);
    const id = state.tasks[0].id;
    expect(projectStatus(state, id, TODAY)).toMatchObject({ mood: 'start', stage: '◌', pct: 0 });
    state = completeSession(state, state.sessions[0].id).state;
    state = completeSession(state, state.sessions[1].id).state;
    const st = projectStatus(state, id, TODAY);
    expect(st.pct).toBe(0.5);
    expect(st.mood).toBe('ahead');
    expect(st.stage).toBe('◑');
    expect(st.weekly[st.weekly.length - 1].minutes).toBe(120);
  });
});

describe('días concretos', () => {
  it('la compra solo los sábados; al editar a martes y sábado, se recoloca', async () => {
    const { editTask } = await import('./scheduler');
    const mon: Ctx = { today: '2026-11-23', now: 7 * 60 };
    let { state } = addTask(base(), { title: 'Compra', category: 'hogar', kind: 'habito', totalMinutes: 60, days: [6], routine: true }, mon);
    expect(state.sessions.map((x) => x.date)).toEqual(['2026-11-28', '2026-12-05']);
    state = editTask(state, state.tasks[0].id, { days: [2, 6] }, mon).state;
    expect(state.sessions.map((x) => x.date).sort()).toEqual(['2026-11-24', '2026-11-28', '2026-12-01', '2026-12-05']);
  });
});

describe('acostarse después de medianoche', () => {
  it('la desconexión empieza 2 h antes de la 01:30 (23:30), no a las 22:00 encima de la cena', async () => {
    const { baseBusy } = await import('./scheduler');
    const p = base({ bed: 90, relaxMinutes: 120, dinner: 21 * 60 + 30 }).profile!;
    const relax = baseBusy(p, '2026-11-28').find((b) => b.end === 1440 && b.start > 12 * 60)!;
    expect(relax.start).toBe(23 * 60 + 30);
  });
});
