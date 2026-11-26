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

/** Confirmación amable (en lugar de window.confirm, que algunos entornos bloquean) */
export function Confirm({
  text,
  yes,
  onYes,
  onClose,
}: {
  text: string;
  yes: string;
  onYes: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose}>
      <p className="confirm-text">{text}</p>
      <button
        className="btn primary wide"
        onClick={() => {
          onClose();
          onYes();
        }}
      >
        {yes}
      </button>
      <button className="btn ghost wide" onClick={onClose}>
        Mejor no
      </button>
    </Sheet>
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

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0];

/** Selector de días de la semana (valores de Date.getDay) */
export function DayPicker({ value, options = DAY_VALUES, onChange }: { value: number[]; options?: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="chips days">
      {DAY_VALUES.filter((d) => options.includes(d)).map((d) => (
        <button
          key={d}
          type="button"
          className={`chip round ${value.includes(d) ? 'on' : ''}`}
          aria-pressed={value.includes(d)}
          onClick={() => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d])}
        >
          {DAY_LABELS[DAY_VALUES.indexOf(d)]}
        </button>
      ))}
    </div>
  );
}


const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180];

/** Duración con chips y, si no está, un número a mano (en minutos) */
export function DurationPicker({ value, onChange, options = DURATIONS }: { value: number; onChange: (v: number) => void; options?: number[] }) {
  const custom = !options.includes(value);
  const [other, setOther] = useState(custom);
  const fmt = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`);
  return (
    <div className="duration-picker">
      <div className="chips">
        {options.map((o) => (
          <button key={o} type="button" className={`chip ${!other && o === value ? 'on' : ''}`} onClick={() => { setOther(false); onChange(o); }}>
            {fmt(o)}
          </button>
        ))}
        <button type="button" className={`chip ${other ? 'on' : ''}`} onClick={() => setOther(true)}>
          Otro
        </button>
      </div>
      {other && (
        <div className="other-min">
          <label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={9999}
              aria-label="Horas"
              value={Math.floor(value / 60)}
              onChange={(e) => onChange(Math.max(5, (Number(e.target.value) || 0) * 60 + (value % 60)))}
            />
            <span>h</span>
          </label>
          <label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              step={5}
              aria-label="Minutos"
              value={value % 60}
              onChange={(e) => onChange(Math.max(5, Math.floor(value / 60) * 60 + Math.min(59, Number(e.target.value) || 0)))}
            />
            <span>min</span>
          </label>
        </div>
      )}
    </div>
  );
}

/** ¿Cuándo? Cuando haya hueco · a una hora fija · a partir de una hora */
export function TimeMode({
  fixed,
  after,
  onChange,
}: {
  fixed?: number;
  after?: number;
  onChange: (v: { fixed?: number; after?: number }) => void;
}) {
  const mode = fixed != null ? 'fija' : after != null ? 'desde' : 'hueco';
  const value = fixed ?? after;
  return (
    <div className="time-mode">
      <div className="chips">
        <button type="button" className={`chip ${mode === 'hueco' ? 'on' : ''}`} onClick={() => onChange({})}>
          ✨ Cuando haya hueco
        </button>
        <button type="button" className={`chip ${mode === 'fija' ? 'on' : ''}`} onClick={() => onChange({ fixed: value ?? 20 * 60 })}>
          🕐 A una hora fija
        </button>
        <button type="button" className={`chip ${mode === 'desde' ? 'on' : ''}`} onClick={() => onChange({ after: value ?? 17 * 60 })}>
          ⏩ A partir de las…
        </button>
      </div>
      {mode !== 'hueco' && (
        <input
          type="time"
          aria-label={mode === 'fija' ? 'Hora fija' : 'A partir de'}
          value={minToHm(value ?? 0)}
          onChange={(e) => e.target.value && onChange(mode === 'fija' ? { fixed: hmToMin(e.target.value) } : { after: hmToMin(e.target.value) })}
        />
      )}
    </div>
  );
}
