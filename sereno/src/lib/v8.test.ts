import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, emptyState, type AppState } from '../types';
import { addTask, baseFreeMinutes, setDayOverride, type Ctx } from './scheduler';
import { addDays } from './time';

const TODAY = '2026-11-26'; // jueves
const ctx: Ctx = { today: TODAY, now: 8 * 60 };
const base = (patch = {}): AppState => ({ ...emptyState(), profile: { ...DEFAULT_PROFILE, name: 'T', createdAt: TODAY, ...patch } });

describe('rutina distinta un día', () => {
  it('si hoy como en 30 min, gano tiempo libre solo hoy', () => {
    const s = base({ works: false });
    const before = baseFreeMinutes(s.profile!, TODAY);
    const r = setDayOverride(s, TODAY, { lunchDuration: 30 }, ctx);
    expect(baseFreeMinutes(r.state.profile!, TODAY)).toBe(before + 30);
    expect(baseFreeMinutes(r.state.profile!, addDays(TODAY, 7))).toBe(before);
  });

  it('si hoy trabajo hasta las 20:00, lo que había a las 18:30 se recoloca', () => {
    const { state } = addTask(base(), { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60, deadline: addDays(TODAY, 3) }, ctx);
    expect(state.sessions[0]).toMatchObject({ date: TODAY, start: 18 * 60 + 30 });
    const r = setDayOverride(state, TODAY, { workEnd: 20 * 60 }, ctx);
    const s = r.state.sessions[0];
    expect(s.date !== TODAY || s.start >= 20 * 60 + 30).toBe(true);
    expect(r.message).toMatch(/he movido «Curso»/);
  });

  it('hoy no trabajo', () => {
    const s = base();
    const r = setDayOverride(s, TODAY, { noWork: true }, ctx);
    expect(baseFreeMinutes(r.state.profile!, TODAY)).toBeGreaterThan(baseFreeMinutes(s.profile!, TODAY) + 400);
  });
});

describe('valores', async () => {
  const { applyValues, goalsFromVision, valueProgress, valuesMessage, VISIONS, guidelineWarning } = await import('./values');
  const { completeSession } = await import('./scheduler');

  it('crea bloques para llegar a «familia 10 h/semana»', () => {
    const r = applyValues(base(), [{ area: 'familia', hours: 10, per: 'semana' }], ctx);
    const t = r.state.tasks.find((x) => x.valueBlock === 'familia')!;
    expect(t).toMatchObject({ title: 'Tiempo en familia', category: 'familia', totalMinutes: 120, timesPerWeek: 5 });
    expect(r.created[0]).toMatch(/Tiempo en familia/);
  });

  it('cuenta lo que ya tienes: si tus tareas cubren el valor, no añade nada', () => {
    let { state } = addTask(base(), { title: 'Cena familiar', category: 'familia', kind: 'habito', totalMinutes: 120, timesPerWeek: 5 }, ctx);
    const r = applyValues(state, [{ area: 'familia', hours: 10, per: 'semana' }], ctx);
    expect(r.state.tasks.some((x) => x.valueBlock)).toBe(false);
    state = r.state;
  });

  it('el progreso sube al completar tiempo en esa área', () => {
    let { state } = applyValues(base(), [{ area: 'familia', hours: 2, per: 'semana' }], ctx);
    const before = valueProgress(state, TODAY)[0].done;
    const s0 = state.sessions.find((x) => x.date >= TODAY)!;
    state = completeSession(state, s0.id).state;
    expect(valueProgress(state, TODAY)[0].done).toBe(before + s0.duration);
  });

  it('mensaje: anima a dedicar más tiempo al área que va por detrás', () => {
    const s = { ...base(), values: [{ area: 'familia' as const, hours: 10, per: 'semana' as const }] };
    const m = valuesMessage(valueProgress(s, '2026-11-28'));
    expect(m.tone).toBe('poco');
    expect(m.title).toMatch(/familia/);
  });

  it('las visiones dan una propuesta completa y avisan si el movimiento es poco', () => {
    const g = goalsFromVision(VISIONS[0]);
    expect(g.length).toBe(6);
    expect(guidelineWarning({ area: 'bienestar', hours: 4, per: 'mes' })).toMatch(/OMS/);
    expect(guidelineWarning({ area: 'bienestar', hours: 3, per: 'semana' })).toBeUndefined();
  });
});

describe('conflictos', async () => {
  const { conflictOf, fixConflict } = await import('./scheduler');
  it('si no cabe antes de la fecha, ofrece opciones y se resuelve', () => {
    const { state } = addTask(base({ weekendFocus: 'no' }), { title: 'Maika', category: 'proyectos', kind: 'flexible', totalMinutes: 900, sessionMinutes: 60, deadline: addDays(TODAY, 9) }, ctx);
    const c = conflictOf(state, state.tasks[0].id)!;
    expect(c.missing).toBeGreaterThan(0);
    expect(c.options.map((o) => o.id)).toEqual(expect.arrayContaining(['finde', 'ampliar', 'cortas', 'reducir']));
    const r = fixConflict(state, state.tasks[0].id, 'reducir', ctx);
    expect(conflictOf(r.state, state.tasks[0].id)).toBeNull();
    expect(r.message).toMatch(/Resuelto/);
    const w = fixConflict(state, state.tasks[0].id, 'finde', ctx);
    expect((w.state.unplaced[state.tasks[0].id] ?? 0)).toBeLessThan(c.missing);
  });
});

describe('fines de semana con franja y modo autónomo', async () => {
  const { weekday } = await import('./time');
  it('proyectos solo los domingos por la tarde (en finde)', () => {
    const p = { weekendFocus: 'franja' as const, weekendSlots: [{ day: 0 as const, part: 'tarde' as const }], works: true };
    const { state } = addTask(base(p), { title: 'Láminas', category: 'proyectos', kind: 'flexible', totalMinutes: 600, sessionMinutes: 60, deadline: addDays(TODAY, 20) }, ctx);
    const weekend = state.sessions.filter((x) => [0, 6].includes(weekday(x.date)));
    expect(weekend.length).toBeGreaterThan(0);
    expect(weekend.every((x) => weekday(x.date) === 0 && x.start >= 14 * 60)).toBe(true);
  });

  it('autónomos: el trabajo va dentro del horario laboral y no gasta tiempo libre', () => {
    const { state } = addTask(base({ planWork: true }), { title: 'Preparar pedidos', category: 'trabajo', kind: 'flexible', totalMinutes: 180, sessionMinutes: 90, deadline: addDays(TODAY, 3) }, ctx);
    expect(state.sessions.length).toBe(2);
    for (const x of state.sessions) {
      expect(x.inWork).toBe(true);
      expect(x.start).toBeGreaterThanOrEqual(9 * 60);
      expect(x.start + x.duration).toBeLessThanOrEqual(18 * 60);
    }
  });
});
