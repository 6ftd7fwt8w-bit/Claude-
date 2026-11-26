export const DAILY_PHRASES = [
  'Los pequeños progresos también son avances.',
  'No tienes que hacerlo todo hoy. Solo lo siguiente.',
  'Descansar también es parte del plan.',
  'Ir despacio sigue siendo avanzar.',
  'Hoy basta con hacerlo un poco mejor que ayer.',
  'Tu valor no se mide en tareas tachadas.',
  'Respira. Lo importante encuentra su momento.',
  'Las raíces crecen en silencio.',
  'Un paso tranquilo vale más que una carrera agotada.',
  'Cuidarte es la tarea que hace posibles todas las demás.',
  'Lo que hoy siembras con calma, mañana florece.',
  'No es falta de tiempo, es elegir bien en qué ponerlo.',
  'Haz espacio para lo que te hace bien.',
  'La constancia amable gana a la intensidad.',
  'Celebra lo que sí has hecho.',
  'Está bien decir «hoy no». Mañana es otro día.',
  'El equilibrio no se encuentra, se cultiva.',
  'Las personas que quieres también son una prioridad.',
  'Cada hoja cuenta. Cada día cuenta.',
  'Termina el día en paz, no en pendientes.',
  'Paciencia: los bonsáis tardan años y son preciosos.',
  'Lo suficiente también es mucho.',
  'Hoy elige tres cosas. Las demás pueden esperar.',
  'Tu energía es un recurso: inviértela con cariño.',
  'Avanzar sin estrés también es avanzar.',
  'Hay días de crecer y días de echar raíces.',
  'Agradece una cosa de hoy antes de dormir.',
  'Menos prisa, más presencia.',
];

export const DONE_PHRASES = [
  '¡Una hoja nueva en tu bonsái!',
  'Pequeños progresos, grandes cambios.',
  '¡Bien hecho! Tómate un respiro.',
  'Paso a paso, sin prisa y sin pausa.',
  'Eso que acabas de hacer cuenta. Mucho.',
  '¡Tu yo de mañana te lo agradece!',
  'Constancia amable',
  '¡Hecho! Siente cómo pesa un poco menos el día.',
  'Tu bonsái acaba de crecer un poquito.',
  '¡Así se cultiva una vida en equilibrio!',
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function phraseOfDay(date: string): string {
  return DAILY_PHRASES[hash(date) % DAILY_PHRASES.length];
}

export function randomDonePhrase(): string {
  return DONE_PHRASES[Math.floor(Math.random() * DONE_PHRASES.length)];
}
