import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, emptyState, type AppState, type DayRecord } from '../types';
import { addRechargeBefore, addTask, rollover, type Ctx } from './scheduler';
import { analyzePlan, mindIndex, personalInsights } from './mind';
import { addDays } from './time';

const TODAY = '2026-11-26';
const ctx: Ctx = { today: TODAY, now: 8 * 60 };
const base = (): AppState => ({ ...emptyState(), profile: { ...DEFAULT_PROFILE, name: 'T', createdAt: TODAY } });

describe('análisis del plan', () => {
  it('recomienda recarga si hay mucho foco y poco bienestar', () => {
    const a = analyzePlan(base().profile!, [
      { title: 'Proyecto', category: 'proyectos', kind: 'flexible', totalMinutes: 1200, deadline: addDays(TODAY, 27) },
    ], TODAY);
    expect(a.focusPerWeek).toBe(300);
    expect(a.rechargeTarget).toBe(75);
    expect(a.suggestRecharge).toBe(true);
    expect(a.steps).toHaveLength(6);
    expect(a.steps[2].result).toMatch(/recarga/);
  });

  it('no lo recomienda si ya hay recarga suficiente', () => {
    const a = analyzePlan(base().profile!, [
      { title: 'Proyecto', category: 'proyectos', kind: 'flexible', totalMinutes: 120, deadline: addDays(TODAY, 13) },
      { title: 'Meditar', category: 'bienestar', kind: 'habito', totalMinutes: 15, timesPerWeek: 5 },
    ], TODAY);
    expect(a.suggestRecharge).toBe(false);
  });
});

describe('índice del día', () => {
  it('sube al añadir recarga antes de la sesión de foco', () => {
    const sat: Ctx = { today: '2026-11-28', now: 8 * 60 };
    let { state } = addTask(base(), { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60, deadline: sat.today }, sat);
    const before = mindIndex(state, sat.today);
    expect(before.focusWithoutRecharge?.title).toBe('Curso');
    const r = addRechargeBefore(state, before.focusWithoutRecharge!.sessionId, sat);
    state = r.state;
    const after = mindIndex(state, sat.today);
    expect(after.score).toBeGreaterThan(before.score);
    expect(after.focusWithoutRecharge).toBeUndefined();
    const focus = state.sessions.find((x) => x.duration === 60)!;
    const rec = state.sessions.find((x) => x.duration === 10)!;
    expect(rec.start + rec.duration).toBe(focus.start);
    expect(r.message).toMatch(/justo antes/);
  });

  it('si justo antes es hora de trabajo, busca el hueco libre anterior más cercano', () => {
    // jueves: la sesión cae a las 18:30, al terminar el trayecto del trabajo
    const { state } = addTask(base(), { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60, deadline: TODAY }, ctx);
    const focus = state.sessions[0];
    expect(focus.start).toBe(18 * 60 + 30);
    const r = addRechargeBefore(state, focus.id, ctx);
    const rec = r.state.sessions.find((x) => x.duration === 10)!;
    expect(rec.start + 10).toBeLessThanOrEqual(focus.start);
    expect(r.message).toMatch(/no cabía/);
  });

  it('con energía baja el índice baja', () => {
    const s = base();
    expect(mindIndex({ ...s, energy: { [TODAY]: 20 } }, TODAY).score).toBeLessThan(mindIndex({ ...s, energy: { [TODAY]: 100 } }, TODAY).score);
  });
});

describe('lo que aprende de tus datos', () => {
  const rec = (patch: Partial<DayRecord>): DayRecord => ({
    energy: 60, planned: 3, done: 2, focusPlanned: 2, focusDone: 1, focusDoneAm: 0, focusDonePm: 1, focusPlannedAm: 0, focusPlannedPm: 2, rechargeMinutes: 0, ...patch,
  });

  it('compara días con recarga y sin ella', () => {
    const history: Record<string, DayRecord> = {};
    for (let i = 1; i <= 4; i++) history[addDays(TODAY, -i)] = rec({ rechargeMinutes: 20, focusDone: 2 });
    for (let i = 5; i <= 8; i++) history[addDays(TODAY, -i)] = rec({ rechargeMinutes: 0, focusDone: 1 });
    const ins = personalInsights({ ...base(), history }, TODAY);
    expect(ins[0].text).toMatch(/completaste el 100% .* el 50%/);
  });

  it('sin datos suficientes no se inventa nada', () => {
    expect(personalInsights(base(), TODAY)).toEqual([]);
  });

  it('el resumen del día se guarda antes de recolocar lo pendiente', () => {
    const yesterday: Ctx = { today: addDays(TODAY, -1), now: 8 * 60 };
    const { state } = addTask(base(), { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60, deadline: addDays(TODAY, 5) }, yesterday);
    const r = rollover(state, ctx);
    expect(r.state.history[addDays(TODAY, -1)]).toMatchObject({ focusPlanned: 1, focusDone: 0 });
  });
});
