import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, emptyState, type AppState } from '../types';
import { addTask, completeSession, gapCandidates, moveAfter, setSessionDuration, stepsPlan, type Ctx } from './scheduler';
import { weekday, addDays } from './time';

const TODAY = '2026-11-26'; // jueves
const ctx: Ctx = { today: TODAY, now: 8 * 60 };
const base = (patch = {}): AppState => ({ ...emptyState(), profile: { ...DEFAULT_PROFILE, name: 'T', createdAt: TODAY, ...patch } });

describe('hora fija', () => {
  it('llamar a mamá cada día a las 20:00', () => {
    const { state } = addTask(base(), { title: 'Llamar a mamá', category: 'social', kind: 'habito', totalMinutes: 15, timesPerWeek: 7, fixedStart: 20 * 60 }, ctx);
    expect(state.sessions.length).toBeGreaterThan(5);
    expect(state.sessions.every((x) => x.start === 20 * 60 && x.duration === 15 && x.pinned)).toBe(true);
  });
});

describe('fines de semana', () => {
  it('lo social solo en fin de semana', () => {
    const { state } = addTask(base(), { title: 'Quedar con amigas', category: 'social', kind: 'habito', totalMinutes: 120, timesPerWeek: 2, dayType: 'weekends' }, ctx);
    expect(state.sessions.length).toBeGreaterThan(0);
    expect(state.sessions.every((x) => [0, 6].includes(weekday(x.date)))).toBe(true);
  });

  it('sin proyectos el fin de semana si así lo eliges', () => {
    const { state } = addTask(base({ weekendFocus: 'no' }), { title: 'Láminas', category: 'proyectos', kind: 'flexible', totalMinutes: 600, sessionMinutes: 60, deadline: addDays(TODAY, 20) }, ctx);
    expect(state.sessions.every((x) => ![0, 6].includes(weekday(x.date)))).toBe(true);
  });

  it('todo seguido en un día (sin partir)', () => {
    const { state } = addTask(base(), { title: 'Montar estantería', category: 'hogar', kind: 'flexible', totalMinutes: 240, sessionMinutes: 240, deadline: addDays(TODAY, 7) }, ctx);
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].duration).toBe(240);
  });
});

describe('ajustes del día', () => {
  it('le dediqué menos tiempo: se recoloca lo que falta', () => {
    let { state } = addTask(base(), { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 120, sessionMinutes: 60, deadline: addDays(TODAY, 10) }, ctx);
    const first = state.sessions.sort((a, b) => a.date.localeCompare(b.date))[0];
    const r = setSessionDuration(state, first.id, 30, ctx);
    state = completeSession(r.state, first.id).state;
    const planned = state.sessions.filter((x) => x.status === 'planned').reduce((a, x) => a + x.duration, 0);
    expect(planned).toBe(90);
    expect(r.message).toMatch(/30 min que faltan/);
  });

  it('poner la ducha después del ejercicio', () => {
    const sat: Ctx = { today: '2026-11-28', now: 8 * 60 };
    let { state } = addTask(base(), { title: 'Ejercicio', category: 'bienestar', kind: 'evento', totalMinutes: 45, date: sat.today, start: 18 * 60 }, sat);
    ({ state } = addTask(state, { title: 'Ducha', category: 'autocuidado', kind: 'evento', totalMinutes: 15, date: sat.today, start: 22 * 60 }, sat));
    const ducha = state.sessions.find((x) => x.duration === 15)!;
    const ej = state.sessions.find((x) => x.duration === 45)!;
    const r = moveAfter(state, ducha.id, ej.id, sat);
    expect(r.state.sessions.find((x) => x.id === ducha.id)!.start).toBe(18 * 60 + 45);
  });
});

describe('pasos de un proyecto', () => {
  it('se reparten por orden en las sesiones', () => {
    const { state } = addTask(
      base(),
      {
        title: 'Láminas', category: 'proyectos', kind: 'flexible', totalMinutes: 180, sessionMinutes: 60, deadline: addDays(TODAY, 10),
        steps: [
          { id: 'a', title: 'Bocetos', minutes: 30 },
          { id: 'b', title: 'Escanear', minutes: 30 },
          { id: 'c', title: 'Colorear', minutes: 60 },
          { id: 'd', title: 'Subir a la tienda' },
        ],
      },
      ctx,
    );
    expect(state.tasks[0].color).toBeTruthy();
    const plan = stepsPlan(state, state.tasks[0].id, TODAY);
    const lists = [...plan.values()].map((l) => l.map((s) => s.title));
    expect(lists).toEqual([['Bocetos', 'Escanear'], ['Colorear'], ['Subir a la tienda']]);
  });

  it('cada proyecto tiene su color', () => {
    let { state } = addTask(base(), { title: 'Láminas', category: 'proyectos', kind: 'flexible', totalMinutes: 60 }, ctx);
    ({ state } = addTask(state, { title: 'Escribir Maika', category: 'proyectos', kind: 'flexible', totalMinutes: 60 }, ctx));
    expect(state.tasks[0].color).not.toBe(state.tasks[1].color);
  });
});

describe('rellenar un hueco', () => {
  it('propone lo que cabe, empezando por lo urgente', () => {
    let { state } = addTask(base(), { title: 'Reclamar vuelo', category: 'gestiones', kind: 'flexible', totalMinutes: 20, deadline: addDays(TODAY, 5) }, { today: TODAY, now: 22 * 60 });
    ({ state } = addTask(state, { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 120, sessionMinutes: 120 }, { today: TODAY, now: 22 * 60 }));
    const c = gapCandidates(state, TODAY, 18 * 60, 45, ctx);
    expect(c.map((x) => x.task.title)).toEqual(['Reclamar vuelo']);
  });
});

describe('hueco libre: no mueve lo que tiene hora o momento propio', () => {
  it('ni llamar a mamá a las 20:00 ni la ducha de noche van a la mañana', () => {
    let { state } = addTask(base(), { title: 'Llamar a mamá', category: 'social', kind: 'habito', totalMinutes: 15, timesPerWeek: 7, fixedStart: 20 * 60 }, ctx);
    ({ state } = addTask(state, { title: 'Ducha', category: 'autocuidado', kind: 'habito', totalMinutes: 15, timesPerWeek: 7, timeOfDay: 'noche', routine: true }, ctx));
    expect(gapCandidates(state, TODAY, 7 * 60 + 45, 60, ctx)).toEqual([]);
  });
});
