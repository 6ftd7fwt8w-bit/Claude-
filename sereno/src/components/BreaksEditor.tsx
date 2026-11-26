import type { WorkBreak } from '../types';
import { fmtDuration, hmToMin, minToHm } from '../lib/time';

const SUGGESTED: WorkBreak[] = [
  { start: 11 * 60, duration: 15 },
  { start: 13 * 60, duration: 15 },
  { start: 16 * 60 + 30, duration: 15 },
];

/** Lista de pausas durante el trabajo: cada una con su hora y duración. */
export function BreaksEditor({ value, onChange }: { value: WorkBreak[]; onChange: (b: WorkBreak[]) => void }) {
  const sorted = [...value].sort((a, b) => a.start - b.start);
  const set = (i: number, patch: Partial<WorkBreak>) => onChange(sorted.map((b, k) => (k === i ? { ...b, ...patch } : b)));
  const free = SUGGESTED.filter((s) => !value.some((v) => v.start === s.start));
  return (
    <div className="breaks">
      {sorted.map((b, i) => (
        <div key={i} className="break-row">
          <span className="break-icon">☕</span>
          <input
            type="time"
            aria-label="Hora de la pausa"
            value={minToHm(b.start)}
            onChange={(e) => e.target.value && set(i, { start: hmToMin(e.target.value) })}
          />
          <div className="chips mini">
            {[5, 10, 15, 20, 30].map((d) => (
              <button key={d} type="button" className={`chip ${b.duration === d ? 'on' : ''}`} onClick={() => set(i, { duration: d })}>
                {fmtDuration(d)}
              </button>
            ))}
          </div>
          <button type="button" className="icon-btn" aria-label="Quitar pausa" onClick={() => onChange(sorted.filter((_, k) => k !== i))}>
            ✕
          </button>
        </div>
      ))}
      <div className="chips">
        {free.map((s) => (
          <button key={s.start} type="button" className="chip add" onClick={() => onChange([...value, s])}>
            + {minToHm(s.start)}
          </button>
        ))}
        <button type="button" className="chip add" onClick={() => onChange([...value, { start: 12 * 60, duration: 10 }])}>
          + Otra hora
        </button>
      </div>
    </div>
  );
}
