import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, emptyState, type AppState } from '../types';
import {
  addTask,
  baseFreeMinutes,
  completeSession,
  editTask,
  importEvents,
  moveSession,
  replanAll,
  type Ctx,
} from './scheduler';
import { icsToEvents } from './ics';
import { guessCategory } from './parse';
import { buy, claimAchievements, seasonFor, writeJournal } from './rewards';
import { addDays } from './time';

const TODAY = '2026-11-26'; // jueves
const ctx: Ctx = { today: TODAY, now: 8 * 60 };
const base = (patch = {}): AppState => ({
  ...emptyState(),
  profile: { ...DEFAULT_PROFILE, name: 'Test', createdAt: TODAY, ...patch },
});

describe('rutina avanzada', () => {
  it('horario distinto el viernes (intensivo hasta las 15:00)', () => {
    const s = base({ workByDay: { 5: { start: 8 * 60, end: 15 * 60 } } });
    expect(baseFreeMinutes(s.profile!, '2026-11-27')).toBeGreaterThan(baseFreeMinutes(s.profile!, TODAY));
  });

  it('si eres de noches, los proyectos van por la tarde', () => {
    const sat: Ctx = { today: '2026-11-28', now: 7 * 60 };
    const early = addTask(base({ chronotype: 'manana' }), { title: 'P', category: 'proyectos', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60 }, sat).state;
    const late = addTask(base({ chronotype: 'noche' }), { title: 'P', category: 'proyectos', kind: 'flexible', totalMinutes: 60, sessionMinutes: 60 }, sat).state;
    expect(early.sessions[0].start).toBeLessThan(12 * 60);
    expect(late.sessions[0].start).toBeGreaterThanOrEqual(15 * 60);
  });
});

describe('edición manual', () => {
  it('una sesión movida a mano se respeta al reorganizar', () => {
    let { state } = addTask(base(), { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 120, sessionMinutes: 60, deadline: addDays(TODAY, 10) }, ctx);
    const id = state.sessions[0].id;
    const r = moveSession(state, id, '2026-11-29', 11 * 60, ctx);
    expect(r.message).toMatch(/Movido/);
    state = replanAll(r.state, ctx);
    const kept = state.sessions.find((x) => x.id === id)!;
    expect(kept).toMatchObject({ date: '2026-11-29', start: 660, pinned: true });
    expect(state.sessions.reduce((a, x) => a + x.duration, 0)).toBe(120);
  });

  it('editar horas y deadline recoloca lo pendiente', () => {
    let { state } = addTask(base(), { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 120, sessionMinutes: 60, deadline: addDays(TODAY, 10) }, ctx);
    state = completeSession(state, state.sessions[0].id).state;
    const taskId = state.tasks[0].id;
    const r = editTask(state, taskId, { totalMinutes: 300, deadline: addDays(TODAY, 4) }, ctx);
    const planned = r.state.sessions.filter((x) => x.status === 'planned');
    expect(planned.reduce((a, x) => a + x.duration, 0)).toBe(240);
    expect(r.message).toMatch(/Recolocado|hueco/);
  });

  it('editar un evento mueve su hora', () => {
    const { state } = addTask(base(), { title: 'Dentista', category: 'autocuidado', kind: 'evento', totalMinutes: 60, date: TODAY, start: 19 * 60 }, ctx);
    const r = editTask(state, state.tasks[0].id, { start: 20 * 60 }, ctx);
    expect(r.state.sessions[0].start).toBe(20 * 60);
  });
});

describe('calendario externo', () => {
  const ICS = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:abc',
    'SUMMARY:Cena con mi hermana',
    'DTSTART:20261128T203000',
    'DTEND:20261128T220000',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:yoga',
    'SUMMARY:Yoga',
    'DTSTART;TZID=Europe/Madrid:20261124T190000',
    'DTEND;TZID=Europe/Madrid:20261124T200000',
    'RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=6',
    'EXDATE;TZID=Europe/Madrid:20261203T190000',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:allday',
    'SUMMARY:Vacaciones',
    'DTSTART;VALUE=DATE:20261130',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  it('lee citas, repeticiones y excepciones; ignora las de todo el día', () => {
    const ev = icsToEvents(ICS, TODAY, 30);
    expect(ev.find((e) => e.uid === 'abc')).toMatchObject({ date: '2026-11-28', start: 20 * 60 + 30, duration: 90 });
    const yoga = ev.filter((e) => e.uid === 'yoga').map((e) => e.date);
    // COUNT=6: 24/11 (pasado), 26, 1/12, 3/12 (excluido, pero cuenta), 8, 10
    expect(yoga).toEqual(['2026-11-26', '2026-12-01', '2026-12-08', '2026-12-10']);
    expect(ev.some((e) => e.uid === 'allday')).toBe(false);
  });

  it('las importa como eventos fijos, sin duplicar', () => {
    const ev = icsToEvents(ICS, TODAY, 30);
    let r = importEvents(base(), ev, 'ics', ctx, guessCategory);
    expect(r.state.tasks).toHaveLength(5);
    expect(r.state.tasks.find((t) => t.title === 'Cena con mi hermana')?.category).toBe('familia');
    r = importEvents(r.state, ev, 'ics', ctx, guessCategory);
    expect(r.state.tasks).toHaveLength(5);
    expect(r.message).toMatch(/al día/);
  });
});

describe('recompensas', () => {
  it('comprar con gotas y equipar', () => {
    let s = { ...base(), drops: 35 };
    let r = buy(s, 'otono');
    expect(r.state.drops).toBe(5);
    expect(r.state.equipped.season).toBe('otono');
    r = buy(r.state, 'dorada');
    expect(r.message).toMatch(/faltan/i);
    s = buy(r.state, 'auto').state;
    expect(s.equipped.season).toBe('auto');
    expect(seasonFor(s.equipped, '2026-04-10')).toBe('primavera');
  });

  it('logros: se celebran una vez y dan gotas', () => {
    let { state } = addTask(base(), { title: 'X', category: 'hogar', kind: 'flexible', totalMinutes: 30, sessionMinutes: 30 }, ctx);
    state = completeSession(state, state.sessions[0].id).state;
    const a = claimAchievements(state, TODAY);
    expect(a.fresh.map((x) => x.id)).toEqual(expect.arrayContaining(['primera-hoja', 'objetivo']));
    expect(a.state.drops).toBeGreaterThan(state.drops);
    expect(claimAchievements(a.state, TODAY).fresh).toHaveLength(0);
  });

  it('diario: +2 gotas la primera vez del día', () => {
    let r = writeJournal(base(), TODAY, 'El café con Marta');
    expect(r.state.drops).toBe(2);
    r = writeJournal(r.state, TODAY, 'El café con Marta y el paseo');
    expect(r.state.drops).toBe(2);
  });
});

describe('widget', () => {
  it('la instantánea lleva lo de hoy y mañana, con progreso', async () => {
    const { widgetSnapshot } = await import('./widget');
    let { state } = addTask(base(), { title: 'Curso', category: 'proyectos', kind: 'flexible', totalMinutes: 180, sessionMinutes: 60, deadline: addDays(TODAY, 1) }, ctx);
    const first = state.sessions.find((s) => s.date === TODAY)!;
    state = completeSession(state, first.id).state;
    const snap = widgetSnapshot(state, TODAY);
    expect(snap.done).toBe(1);
    expect(snap.total).toBe(state.sessions.filter((s) => s.date === TODAY).length);
    expect(snap.sessions.every((s) => s.date === TODAY || s.date === addDays(TODAY, 1))).toBe(true);
    expect(snap.sessions[0]).toMatchObject({ title: 'Curso', emoji: '✨', done: true });
    expect(snap.leaves).toBe(1);
  });
});
