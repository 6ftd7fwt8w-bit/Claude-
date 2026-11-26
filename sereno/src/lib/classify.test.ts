import { describe, expect, it } from 'vitest';
import { detectCategory, estimateMinutes, learnCategory } from './parse';

describe('clasificación de tareas reales', () => {
  const cases: [string, string][] = [
    ['Trabajar en láminas Shei', 'proyectos'],
    ['Reclamar vuelo Japón follow up', 'gestiones'],
    ['Revisar prórroga alquiler', 'gestiones'],
    ['Llamar a natación', 'gestiones'],
    ['Hacer seguimiento de gastos con Claude', 'gestiones'],
    ['Llamar a mi madre', 'familia'],
    ['Bañar a los niños', 'familia'],
    ['Llamar a Laura', 'social'],
    ['Quedar con amigas', 'social'],
    ['Pagar el seguro del coche', 'gestiones'],
    ['Hacer la compra', 'hogar'],
    ['Meditar', 'bienestar'],
  ];
  for (const [text, cat] of cases) {
    it(text, () => expect(detectCategory(text)).toBe(cat));
  }

  it('estima la duración', () => {
    expect(estimateMinutes('Llamar a natación', 'gestiones')).toEqual({ minutes: 15, big: false });
    expect(estimateMinutes('Reclamar vuelo Japón', 'gestiones').minutes).toBe(20);
    expect(estimateMinutes('Revisar prórroga alquiler', 'gestiones').minutes).toBe(30);
    expect(estimateMinutes('Trabajar en láminas Shei', 'proyectos').big).toBe(true);
  });

  it('aprende de las correcciones', () => {
    const learned = learnCategory(undefined, 'Vivalahome: preparar pedidos', 'trabajo');
    expect(detectCategory('Responder pedidos de vivalahome', learned)).toBe('trabajo');
  });
});

describe('periodicidad mensual', async () => {
  const { parseQuick } = await import('./parse');
  const { addTask } = await import('./scheduler');
  const { DEFAULT_PROFILE, emptyState } = await import('../types');

  it('entiende «2 veces al mes»', () => {
    expect(parseQuick('Quedar con amigas 2 veces al mes', '2026-11-26')).toMatchObject({ title: 'Quedar con amigas', kind: 'habito', timesPerMonth: 2, category: 'social' });
    expect(parseQuick('Revisar gastos cada mes', '2026-11-26')).toMatchObject({ timesPerMonth: 1, category: 'gestiones' });
    expect(parseQuick('Correr dos veces por semana', '2026-11-26')).toMatchObject({ timesPerWeek: 2 });
  });

  it('reparte las veces a lo largo del mes', () => {
    const ctx = { today: '2026-12-01', now: 8 * 60 };
    const s0 = { ...emptyState(), profile: { ...DEFAULT_PROFILE, createdAt: ctx.today } };
    const { state } = addTask(s0, { title: 'Quedar con amigas', category: 'social', kind: 'habito', totalMinutes: 120, timesPerMonth: 2 }, ctx);
    const dec = state.sessions.filter((x) => x.date.startsWith('2026-12')).map((x) => x.date).sort();
    expect(dec).toHaveLength(2);
    expect(dec[0] <= '2026-12-16').toBe(true);
    expect(dec[1] > '2026-12-15').toBe(true);
    expect(state.sessions.filter((x) => x.date.startsWith('2027-01'))).toHaveLength(2);
  });
});

describe('eventos con franja y pareja', async () => {
  const { parseQuick, detectCategory } = await import('./parse');
  it('«el sábado voy a almorzar con mis padres de 10 a 2»', () => {
    const p = parseQuick('El sábado voy a almorzar con mis padres de 10 a 2', '2026-11-26');
    expect(p).toMatchObject({ kind: 'evento', date: '2026-11-28', start: 600, totalMinutes: 240, category: 'familia' });
    expect(p.title).toBe('Voy a almorzar con mis padres');
  });
  it('«Cine con Marta de 18:30 a 20:45 mañana»', () => {
    expect(parseQuick('Cine con Marta de 18:30 a 20:45 mañana', '2026-11-26')).toMatchObject({ kind: 'evento', date: '2026-11-27', start: 18 * 60 + 30, totalMinutes: 135 });
  });
  it('«de 10h a 14h» no se confunde con una duración de 10 h', () => {
    expect(parseQuick('Taller de cerámica el domingo de 10h a 14h', '2026-11-26')).toMatchObject({ start: 600, totalMinutes: 240 });
  });
  it('pareja', () => {
    expect(detectCategory('Cena romántica con mi pareja')).toBe('pareja');
    expect(detectCategory('Aniversario con mi novio')).toBe('pareja');
  });
});
