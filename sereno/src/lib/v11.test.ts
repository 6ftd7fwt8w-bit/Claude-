import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, emptyState, type AppState } from '../types';
import { addTask, type Ctx } from './scheduler';
import { parseQuick } from './parse';
import { AFICION_SUGGESTIONS, spreadHobbies } from './suggestions';
import { applyValues, pruneValueBlocks } from './values';
import { PALETTES } from './palettes';
import { addDays } from './time';

const TODAY = '2026-11-26'; // jueves
const ctx: Ctx = { today: TODAY, now: 8 * 60 };
const base = (patch = {}): AppState => ({ ...emptyState(), profile: { ...DEFAULT_PROFILE, name: 'T', createdAt: TODAY, ...patch } });

describe('ejemplos de la barra «¿Qué tienes en mente?»', () => {
  it('«Mañana almuerzo con mis padres de 10 a 2» es una cita de mañana de 10:00 a 14:00 en Familia', () => {
    const q = parseQuick('Mañana almuerzo con mis padres de 10 a 2', TODAY);
    expect(q).toMatchObject({ kind: 'evento', date: addDays(TODAY, 1), start: 600, totalMinutes: 240, category: 'familia' });
  });
  it('«Llamar a mamá el viernes a las 20:00» tiene hora', () => {
    const q = parseQuick('Llamar a mamá el viernes a las 20:00', TODAY);
    expect(q.start).toBe(20 * 60);
    expect(q.date).toBe('2026-11-27');
  });
  it('«Gimnasio 3 veces por semana» se repite', () => {
    expect(parseQuick('Gimnasio 3 veces por semana', TODAY)).toMatchObject({ kind: 'habito', timesPerWeek: 3 });
  });
});

describe('aficiones concretas', () => {
  it('reparte las horas que quieres dedicar entre las aficiones elegidas', () => {
    const two = AFICION_SUGGESTIONS.filter((h) => h.title === 'Videojuegos' || h.title === 'Fotografía');
    // 6 h a la semana para aficiones
    const r = spreadHobbies(two, 360);
    const weekly = r.reduce((a, h) => a + h.minutes * h.times, 0);
    expect(weekly).toBeGreaterThan(two.reduce((a, h) => a + h.minutes * h.times, 0));
    expect(Math.abs(weekly - 360)).toBeLessThanOrEqual(120);
  });
  it('si ya tienes aficiones concretas, no creo el genérico «Mis aficiones»', () => {
    const { state } = addTask(base(), { title: 'Videojuegos', category: 'aficiones', kind: 'habito', totalMinutes: 60, timesPerWeek: 2 }, ctx);
    const r = applyValues(state, [{ area: 'aficiones', hours: 10, per: 'semana' }], ctx);
    expect(r.state.tasks.some((t) => t.valueBlock === 'aficiones' && !t.archived)).toBe(false);
  });
  it('y si las añades después, el genérico se quita', () => {
    const r = applyValues(base(), [{ area: 'aficiones', hours: 4, per: 'semana' }], ctx);
    expect(r.state.tasks.some((t) => t.valueBlock === 'aficiones' && !t.archived)).toBe(true);
    const s2 = addTask(r.state, { title: 'Tocar la guitarra', category: 'aficiones', kind: 'habito', totalMinutes: 30, timesPerWeek: 3 }, ctx).state;
    const pruned = pruneValueBlocks(s2);
    expect(pruned.tasks.some((t) => t.valueBlock === 'aficiones' && !t.archived)).toBe(false);
  });
});

describe('estilos de color', () => {
  it('hay al menos 4 estilos además del de siempre', () => {
    expect(PALETTES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length);
  });
});
