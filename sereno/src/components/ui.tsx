import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { CATEGORIES, type CategoryId } from '../types';
import { hmToMin, minToHm } from '../lib/time';

export function Sheet({ title, onClose, children }: { title?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {title && (
          <div className="sheet-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4200);
    return () => clearTimeout(t);
  }, [text, onDone]);
  return (
    <div className="toast" role="status" onClick={onDone}>
      {text}
    </div>
  );
}

export function TimeInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <input type="time" value={minToHm(value)} onChange={(e) => e.target.value && onChange(hmToMin(e.target.value))} />
    </label>
  );
}

export function NumberChips({
  value,
  options,
  onChange,
  fmt,
}: {
  value: number;
  options: number[];
  onChange: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o} type="button" className={`chip ${o === value ? 'on' : ''}`} onClick={() => onChange(o)}>
          {fmt(o)}
        </button>
      ))}
    </div>
  );
}

export function CategoryPicker({ value, onChange }: { value: CategoryId; onChange: (c: CategoryId) => void }) {
  return (
    <div className="chips">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`chip ${c.id === value ? 'on' : ''}`}
          style={{ '--chip': c.color } as CSSProperties}
          onClick={() => onChange(c.id)}
        >
          {c.emoji} {c.label}
        </button>
      ))}
    </div>
  );
}

/** Anillo de progreso */
export function Ring({ value, size = 64, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring" aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth="7" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, value))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .8s ease' }}
      />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" className="ring-text">
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

/** Celebración al completar algo: hojas que caen y una frase. */
export function Celebration({ text, sub, onDone }: { text: string; sub?: string; onDone: () => void }) {
  useEffect(() => {
    try {
      navigator.vibrate?.(25);
    } catch {
      /* no soportado */
    }
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  const [bits] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 400,
      dur: 1400 + Math.random() * 900,
      emoji: ['🍃', '🌿', '✨', '🍃', '🌸'][i % 5],
    })),
  );
  return (
    <div className="celebrate" onClick={onDone} aria-live="polite">
      {bits.map((b, i) => (
        <span key={i} className="fall" style={{ left: `${b.left}%`, animationDelay: `${b.delay}ms`, animationDuration: `${b.dur}ms` }}>
          {b.emoji}
        </span>
      ))}
      <div className="celebrate-card">
        <div className="celebrate-icon">🌱</div>
        <p className="celebrate-text">{text}</p>
        {sub && <p className="celebrate-sub">{sub}</p>}
      </div>
    </div>
  );
}

const PHASES = [
  { label: 'Inspira', secs: 4, cls: 'in' },
  { label: 'Mantén', secs: 4, cls: 'hold' },
  { label: 'Suelta', secs: 6, cls: 'out' },
];

/** Respiración guiada 4-4-6 */
export function Breathe({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState(0);
  const [cycles, setCycles] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase((p) => (p + 1) % PHASES.length);
      if (phase === PHASES.length - 1) setCycles((c) => c + 1);
    }, PHASES[phase].secs * 1000);
    return () => clearTimeout(t);
  }, [phase]);
  const ph = PHASES[phase];
  return (
    <Sheet title="Respira un momento" onClose={onClose}>
      <div className="breathe">
        <div className={`breathe-circle ${ph.cls}`} style={{ transitionDuration: `${ph.secs}s` }}>
          <span>{ph.label}</span>
        </div>
        <p className="muted">
          {cycles === 0 ? 'Sigue el círculo. Sin prisa.' : `${cycles} ${cycles === 1 ? 'respiración' : 'respiraciones'} · lo estás haciendo genial`}
        </p>
        <button className="btn soft" onClick={onClose}>
          {cycles >= 4 ? 'Me siento mejor 💛' : 'Terminar'}
        </button>
      </div>
    </Sheet>
  );
}
