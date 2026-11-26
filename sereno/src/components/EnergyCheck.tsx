import { useState } from 'react';
import type { WorkBreak } from '../types';
import { BreaksEditor } from './BreaksEditor';
import { Sheet } from './ui';

export const ENERGY_LEVELS = [
  { value: 20, label: 'Sin batería', emoji: '○' },
  { value: 40, label: 'Baja', emoji: '◔' },
  { value: 60, label: 'Normal', emoji: '◑' },
  { value: 80, label: 'Bien', emoji: '◕' },
  { value: 100, label: 'A tope', emoji: '●' },
];

export function energyEmoji(v: number): string {
  return ENERGY_LEVELS.reduce((best, l) => (Math.abs(l.value - v) < Math.abs(best.value - v) ? l : best)).emoji;
}

export function EnergyCheck({
  name,
  initial,
  breaks,
  onPick,
  onClose,
}: {
  name: string;
  initial?: number;
  /** pausas de hoy (solo si hoy se trabaja) */
  breaks?: WorkBreak[];
  onPick: (v: number, breaks?: WorkBreak[]) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState(initial ?? 60);
  const [b, setB] = useState<WorkBreak[] | undefined>(breaks);
  return (
    <Sheet title={`¿Cómo te sientes hoy${name ? `, ${name}` : ''}?`} onClose={onClose}>
      <p className="muted">Según tu energía, ajusto cuánto te propongo hacer. Escúchate: aquí no hay respuestas malas.</p>
      <div className="energy-options">
        {ENERGY_LEVELS.map((l) => (
          <button key={l.value} className={`energy-option ${v === l.value ? 'on' : ''}`} onClick={() => setV(l.value)}>
            <span className="energy-emoji">{l.emoji}</span>
            <span className="energy-pct">{l.value}%</span>
            <span className="energy-label">{l.label}</span>
          </button>
        ))}
      </div>
      {b && (
        <div className="field">
          <span>◔ ¿Qué pausas tienes hoy mientras trabajas?</span>
          <BreaksEditor value={b} onChange={setB} />
          <small className="muted">Pondré ahí cosas cortas: meditar, estirar, unos abdominales…</small>
        </div>
      )}
      <button className="btn primary wide" onClick={() => onPick(v, b)}>
        Ajustar mi día
      </button>
    </Sheet>
  );
}
