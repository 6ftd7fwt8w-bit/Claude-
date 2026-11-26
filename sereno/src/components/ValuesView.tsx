import { useState, type CSSProperties } from 'react';
import type { AppState, ValueGoal } from '../types';
import { valueProgress, valuesMessage } from '../lib/values';
import { fmtDuration, fmtShort } from '../lib/time';
import { ValuesEditor } from './ValuesEditor';
import { Sheet } from './ui';
import { CatIcon } from './Icons';

/** Cómo vas con lo que es importante para ti */
export function ValuesView({
  state,
  today,
  onSave,
}: {
  state: AppState;
  today: string;
  onSave: (values: ValueGoal[], vision?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ValueGoal[]>(state.values ?? []);
  const [vision, setVision] = useState<string | undefined>(state.vision);
  const list = valueProgress(state, today);
  const msg = valuesMessage(list);
  const pct = (m: number, t: number) => `${Math.min(100, (m / Math.max(1, t)) * 100)}%`;

  return (
    <div className="view">
      <header>
        <p className="eyebrow">Lo que es importante para ti</p>
        <h1>Tus valores</h1>
      </header>

      <section className={`card values-msg tone-${msg.tone}`}>
        <p className="h3">{msg.title}</p>
        <p className="muted">{msg.text}</p>
      </section>

      {list.length === 0 && (
        <button className="btn primary wide" onClick={() => setEditing(true)}>
          Definir mis valores
        </button>
      )}

      <div className="value-bars">
        {list.map((p) => (
          <section key={p.goal.area} className={`card value-bar status-${p.status}`} style={{ '--cat': p.color } as CSSProperties}>
            <div className="vb-head">
              <CatIcon cat={p.goal.area} size={34} />
              <strong className="grow">{p.info.label}</strong>
              <span className="vb-num">
                {fmtDuration(p.done)} <span className="muted">/ {fmtDuration(p.target)}</span>
              </span>
            </div>
            <div className="vb-track" aria-label={`${p.info.label}: ${fmtDuration(p.done)} de ${fmtDuration(p.target)}`}>
              <span className="vb-planned" style={{ width: pct(p.planned, p.target) }} />
              <span className="vb-done" style={{ width: pct(p.done, p.target) }} />
              {p.expected < p.target && <i className="vb-expected" style={{ left: pct(p.expected, p.target) }} />}
            </div>
            <p className="vb-foot muted small">
              {p.goal.per === 'semana' ? 'Esta semana' : `Este mes (hasta el ${fmtShort(p.to)})`} ·{' '}
              {p.status === 'genial' ? '¡Vas genial!' : p.status === 'bien' ? 'Vas bien' : 'Dale un poco más de cariño'}
              {p.planned > p.done && ` · ${fmtDuration(p.planned - p.done)} planificadas`}
            </p>
          </section>
        ))}
      </div>
      {list.length > 0 && (
        <p className="muted small center">
          Barra llena: hecho · clara: planificado · rayita: lo que tocaría llevar hoy para llegar con calma.
        </p>
      )}

      {list.length > 0 && (
        <div className="quick-row single">
          <button
            className="btn soft"
            onClick={() => {
              setDraft(state.values ?? []);
              setVision(state.vision);
              setEditing(true);
            }}
          >
            Ajustar mis valores
          </button>
        </div>
      )}

      {editing && (
        <Sheet title="Tus valores" onClose={() => setEditing(false)}>
          <ValuesEditor
            vision={vision}
            goals={draft}
            onChange={(g, v) => {
              setDraft(g);
              setVision(v);
            }}
          />
          <button
            className="btn primary wide"
            onClick={() => {
              setEditing(false);
              onSave(draft, vision);
            }}
          >
            Guardar y organizar mi tiempo
          </button>
        </Sheet>
      )}
    </div>
  );
}
