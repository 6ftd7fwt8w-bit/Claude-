import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, emptyState, type AppState } from '../types';
import {
  addTask,
  baseFreeMinutes,
  capacity,
  completeSession,
  dayLoad,
  freeWindows,
  postponeSession,
  pullForward,
  rollover,
  setEnergy,
  splitChunks,
  type Ctx,
} from './scheduler';
import { addDays } from './time';

// 2026-11-26 es jueves
const TODAY = '2026-11-26';
const ctx: Ctx = { today: TODAY, now: 8 * 60 };

function base(): AppState {
  return { ...emptyState(), profile: { ...DEFAULT_PROFILE, name: 'Test', createdAt: TODAY } };
}

describe('tiempo libre', () => {
  it('respeta rutina, trabajo, comidas y desconexión', () => {
    const p = base().profile!;
    // laborable: 7:45-8:30 (45) + 18:30-21:00 (150) + 22:00-22:30 (30) = 225
    expect(baseFreeMinutes(p, TODAY)).toBe(225);
    // sábado: 7:45-14:00 (375) + 15:00-21:00 (360) + 22:00-22:30 (30) = 765
    expect(baseFreeMinutes(p, '2026-11-28')).toBe(765);
  });

  it('la energía cambia la capacidad', () => {
    const s = base();
    const normal = capacity(s, TODAY);
    const low = capacity({ ...s, energy: { [TODAY]: 20 } }, TODAY);
    expect(low).toBeLessThan(normal / 2);
  });

  it('no propone huecos en el pasado de hoy', () => {
    const p = base().profile!;
    const w = freeWindows(p, TODAY, [], 19 * 60);
    expect(w[0].start).toBeGreaterThanOrEqual(19 * 60);
  });
});

describe('trocear', () => {
  it('divide en sesiones y une restos pequeños', () => {
    expect(splitChunks(600, 60)).toEqual(Array(10).fill(60));
    expect(splitChunks(130, 60)).toEqual([60, 70]);
    expect(splitChunks(150, 60)).toEqual([60, 60, 30]);
  });
});

describe('tareas flexibles', () => {
  it('reparte 10 h antes del deadline sin salirse de la rutina', () => {
    const deadline = addDays(TODAY, 20);
    const { state, message } = addTask(
      base(),
      { title: 'Proyecto personal', category: 'proyectos', kind: 'flexible', totalMinutes: 600, sessionMinutes: 60, deadline },
      ctx,
    );
    const mine = state.sessions.filter((s) => s.status === 'planned');
    expect(mine.reduce((a, s) => a + s.duration, 0)).toBe(600);
    expect(mine.every((s) => s.date >= TODAY && s.date <= deadline)).toBe(true);
    // nunca durante el trabajo
    for (const s of mine) {
      const wd = new Date(s.date).getDay();
      if (wd >= 1 && wd <= 5) expect(s.start < 8 * 60 + 30 || s.start >= 18 * 60 + 30).toBe(true);
    }
    // ningún día rojo por esta tarea sola
    for (const s of mine) expect(dayLoad(state, s.date).level).not.toBe('rojo');
    expect(message).toMatch(/Propuesta/);
    expect(state.unplaced).toEqual({});
  });

  it('avisa cuando no cabe antes del deadline', () => {
    const { state } = addTask(
      base(),
      { title: 'Imposible', category: 'proyectos', kind: 'flexible', totalMinutes: 20 * 60, sessionMinutes: 60, deadline: addDays(TODAY, 1) },
      ctx,
    );
    expect(Object.values(state.unplaced)[0]).toBeGreaterThan(0);
  });

  it('lo no hecho de ayer se reasigna al abrir hoy', () => {
    const yesterdayCtx: Ctx = { today: addDays(TODAY, -1), now: 8 * 60 };
    let { state } = addTask(
      base(),
      { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 120, sessionMinutes: 60, deadline: addDays(TODAY, 10) },
      yesterdayCtx,
    );
    const before = state.sessions.filter((s) => s.date < TODAY).length;
    expect(before).toBeGreaterThan(0);
    const r = rollover(state, ctx);
    state = r.state;
    expect(r.moved).toBe(before);
    expect(state.sessions.every((s) => s.date >= TODAY)).toBe(true);
    expect(state.sessions.reduce((a, s) => a + s.duration, 0)).toBe(120);
  });

  it('posponer mueve la sesión a otro día', () => {
    const { state } = addTask(
      base(),
      { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60, deadline: addDays(TODAY, 5) },
      ctx,
    );
    const s0 = state.sessions[0];
    const r = postponeSession(state, s0.id, ctx);
    expect(r.state.sessions).toHaveLength(1);
    expect(r.state.sessions[0].date > s0.date).toBe(true);
    expect(r.message).toMatch(/movido/);
  });

  it('completar todas las horas cierra el objetivo', () => {
    let { state } = addTask(
      base(),
      { title: 'Mini', category: 'hogar', kind: 'flexible', totalMinutes: 60, sessionMinutes: 30 },
      ctx,
    );
    const [a, b] = state.sessions;
    state = completeSession(state, a.id).state;
    const r = completeSession(state, b.id);
    expect(r.message).toMatch(/terminado/);
    expect(r.state.drops).toBeGreaterThan(0);
  });
});

describe('energía', () => {
  it('con energía baja aligera el día moviendo lo que tiene margen', () => {
    let s = base();
    // saturamos el sábado con varias tareas sin deadline
    const sat: Ctx = { today: '2026-11-28', now: 8 * 60 };
    for (let i = 0; i < 6; i++) {
      s = addTask(s, { title: `T${i}`, category: 'proyectos', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60 }, sat).state;
    }
    const todayBefore = s.sessions.filter((x) => x.date === sat.today).length;
    const r = setEnergy(s, sat.today, 20, sat);
    const todayAfter = r.state.sessions.filter((x) => x.date === sat.today).length;
    expect(todayAfter).toBeLessThan(todayBefore);
    expect(dayLoad(r.state, sat.today).planned).toBeLessThanOrEqual(capacity(r.state, sat.today));
  });

  it('tengo un hueco: adelanta lo siguiente', () => {
    const late: Ctx = { today: TODAY, now: 23 * 60 }; // hoy ya no cabe nada al crearla
    let { state } = addTask(
      base(),
      { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60, deadline: addDays(TODAY, 5) },
      late,
    );
    expect(state.sessions[0].date > TODAY).toBe(true);
    const r = pullForward(state, ctx);
    expect(r.state.sessions[0].date).toBe(TODAY);
  });
});

describe('eventos y hábitos', () => {
  it('un evento fijo desplaza lo que pise', () => {
    let { state } = addTask(
      base(),
      { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60, deadline: addDays(TODAY, 3) },
      ctx,
    );
    const s0 = state.sessions[0];
    const r = addTask(
      state,
      { title: 'Cena con Ana', category: 'social', kind: 'evento', totalMinutes: s0.duration, date: s0.date, start: s0.start },
      ctx,
    );
    const flex = r.state.sessions.find((x) => !x.fixed)!;
    const ev = r.state.sessions.find((x) => x.fixed)!;
    expect(flex.date !== ev.date || flex.start + flex.duration <= ev.start || flex.start >= ev.start + ev.duration).toBe(true);
    expect(r.message).toMatch(/movido/);
  });

  it('un hábito semanal se coloca en días distintos', () => {
    const mon: Ctx = { today: '2026-11-23', now: 7 * 60 };
    const { state } = addTask(
      base(),
      { title: 'Meditar', category: 'bienestar', kind: 'habito', totalMinutes: 10, timesPerWeek: 3 },
      mon,
    );
    const thisWeek = state.sessions.filter((s) => s.date <= '2026-11-29');
    expect(thisWeek).toHaveLength(3);
    expect(new Set(thisWeek.map((s) => s.date)).size).toBe(3);
    // y también la semana siguiente
    expect(state.sessions.filter((s) => s.date > '2026-11-29')).toHaveLength(3);
  });
});
