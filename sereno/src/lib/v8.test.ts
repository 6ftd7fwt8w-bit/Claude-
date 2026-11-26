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
