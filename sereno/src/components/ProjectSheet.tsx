import type { CSSProperties } from 'react';
import type { AppState, Task } from '../types';
import { catById } from '../types';
import { projectStatus } from '../lib/scheduler';
import { fmtDuration, fmtRelative, fmtShort, minToHm } from '../lib/time';
import { Sheet } from './ui';

const MILESTONES = [
  { at: 0.25, icon: '🌱', label: 'Brote' },
  { at: 0.5, icon: '🌿', label: 'Mitad' },
  { at: 0.75, icon: '🪴', label: 'Casi' },
  { at: 1, icon: '🌳', label: '¡Logrado!' },
];

/** Progreso real de un proyecto: cuánto llevas, a qué ritmo y qué viene ahora. */
export function ProjectSheet({
  state,
  task,
  today,
  onClose,
  onEdit,
}: {
  state: AppState;
  task: Task;
  today: string;
  onClose: () => void;
  onEdit: (t: Task) => void;
}) {
  const st = projectStatus(state, task.id, today);
  const cat = catById(task.category);
  const r = 52;
  const c = 2 * Math.PI * r;
  const maxWeek = Math.max(60, ...st.weekly.map((w) => w.minutes));
  const upcoming = state.sessions
    .filter((x) => x.taskId === task.id && x.status === 'planned' && x.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
    .slice(0, 4);
  const unplaced = state.unplaced[task.id] ?? 0;

  return (
    <Sheet title={task.title} onClose={onClose}>
      <div className="project-detail" style={{ '--cat': cat.color } as CSSProperties}>
        <div className="pd-hero">
          <svg viewBox="0 0 120 120" width="132" height="132" aria-label={`${Math.round(st.pct * 100)}% hecho`}>
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--track)" strokeWidth="9" />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="var(--cat)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - st.pct)}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
            {st.expected != null && st.pct < 1 && (
              <circle
                cx={60 + r * Math.sin(st.expected * 2 * Math.PI)}
                cy={60 - r * Math.cos(st.expected * 2 * Math.PI)}
                r="4.5"
                fill="var(--surface)"
                stroke="var(--ink-2)"
                strokeWidth="2"
              />
            )}
          </svg>
          <span className="pd-stage">{st.stage}</span>
          <p className="pd-pct">{Math.round(st.pct * 100)}%</p>
          <p className="muted small">
            {cat.emoji} {cat.label}
          </p>
        </div>

        <p className={`pd-phrase mood-${st.mood}`}>{st.phrase}</p>

        <div className="pd-stats">
          <div>
            <strong>{fmtDuration(st.done)}</strong>
            <span>hecho</span>
          </div>
          <div>
            <strong>{fmtDuration(Math.max(0, st.total - st.done))}</strong>
            <span>por hacer</span>
          </div>
          <div>
            <strong>{st.sessionsDone}</strong>
            <span>sesiones hechas</span>
          </div>
          <div>
            <strong>{task.deadline ? fmtShort(task.deadline) : '—'}</strong>
            <span>fecha límite</span>
          </div>
        </div>
        {st.expected != null && st.expected >= 0.05 && st.pct < 1 && (
          <p className="muted small center">
            El puntito del círculo marca dónde tocaría ir hoy para llegar con calma ({Math.round(st.expected * 100)}%).
          </p>
        )}
        {unplaced > 0 && (
          <p className="warn small center">⚠️ {fmtDuration(unplaced)} no caben antes de la fecha límite.</p>
        )}

        <div className="pd-section">
          <p className="h3">Hitos</p>
          <div className="milestones">
            {MILESTONES.map((m) => (
              <div key={m.at} className={`milestone ${st.pct >= m.at ? 'on' : ''}`}>
                <span className="ms-icon">{st.pct >= m.at ? m.icon : '○'}</span>
                <span className="ms-label">
                  {m.label}
                  <small>{Math.round(m.at * 100)}%</small>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pd-section">
          <p className="h3">Tus últimas semanas</p>
          <div className="weeks" role="img" aria-label="Horas dedicadas por semana">
            {st.weekly.map((w, i) => (
              <div key={w.week} className="week-col">
                <span className="week-val">{w.minutes ? fmtDuration(w.minutes) : ''}</span>
                <span className="week-bar-v" style={{ height: `${(w.minutes / maxWeek) * 100}%` }} />
                <span className="week-lbl">{i === st.weekly.length - 1 ? 'Esta' : fmtShort(w.week).replace(/^\S+ /, '')}</span>
              </div>
            ))}
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className="pd-section">
            <p className="h3">Lo que viene</p>
            <div className="upcoming">
              {upcoming.map((x) => (
                <div key={x.id} className="upcoming-row">
                  <span className="cap">{fmtRelative(x.date, today)}</span>
                  <span className="muted">
                    {minToHm(x.start)} · {fmtDuration(x.duration)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn soft wide" onClick={() => onEdit(task)}>
          ✏️ Cambiar horas o fecha
        </button>
      </div>
    </Sheet>
  );
}
