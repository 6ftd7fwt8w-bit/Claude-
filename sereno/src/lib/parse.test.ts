import { describe, expect, it } from 'vitest';
import { parseQuick } from './parse';

const TODAY = '2026-11-26'; // jueves

describe('entrada rápida', () => {
  it('proyecto con horas y deadline', () => {
    const p = parseQuick('Trabajar en mi proyecto personal 10h antes del 15/12', TODAY);
    expect(p).toMatchObject({
      title: 'Trabajar en mi proyecto personal',
      kind: 'flexible',
      totalMinutes: 600,
      deadline: '2026-12-15',
      category: 'proyectos',
    });
  });

  it('evento con día de la semana y hora', () => {
    const p = parseQuick('Cena con Ana el viernes a las 21:30', TODAY);
    expect(p).toMatchObject({ title: 'Cena con Ana', kind: 'evento', date: '2026-11-27', start: 21 * 60 + 30, category: 'social' });
  });

  it('hábito con veces por semana', () => {
    const p = parseQuick('Meditar 10 min 5 veces por semana', TODAY);
    expect(p).toMatchObject({ title: 'Meditar', kind: 'habito', totalMinutes: 10, timesPerWeek: 5, category: 'bienestar' });
  });

  it('mañana, horas decimales y tildes', () => {
    const p = parseQuick('Limpiar la casa 1,5 horas para mañana', TODAY);
    expect(p).toMatchObject({ title: 'Limpiar la casa', totalMinutes: 90, deadline: '2026-11-27', category: 'hogar' });
  });

  it('fecha con mes escrito pasa al año siguiente si ya pasó', () => {
    const p = parseQuick('Estudiar inglés 20h antes del 3 de marzo', TODAY);
    expect(p.deadline).toBe('2027-03-03');
    expect(p.title).toBe('Estudiar inglés');
  });

  it('hora de la tarde', () => {
    const p = parseQuick('Dentista mañana a las 5 de la tarde', TODAY);
    expect(p).toMatchObject({ title: 'Dentista', kind: 'evento', date: '2026-11-27', start: 17 * 60, category: 'autocuidado' });
  });
});
