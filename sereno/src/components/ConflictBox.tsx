import type { AppState } from '../types';
import { conflictOf, type ConflictFix } from '../lib/scheduler';
import { fmtDuration } from '../lib/time';

/** Aviso en rojo cuando algo no cabe antes de su fecha, con opciones para resolverlo. */
export function ConflictBox({ state, taskId, onFix }: { state: AppState; taskId: string; onFix: (taskId: string, fix: ConflictFix) => void }) {
  const c = conflictOf(state, taskId);
  if (!c) return null;
  return (
    <div className="conflict" role="alert" onClick={(e) => e.stopPropagation()}>
      <p className="conflict-title">⚠️ No cabe todo: faltan {fmtDuration(c.missing)} antes de la fecha</p>
      <div className="conflict-options">
        {c.options.map((o) => (
          <button key={o.id} className="conflict-btn" onClick={() => onFix(taskId, o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
