import { useState, type CSSProperties } from 'react';
import type { AppState, Task } from '../types';
import { catById, taskColor, type DayType, type Step } from '../types';
import { projectStatus, stepsPlan, uid, type ConflictFix, type TaskPatch } from '../lib/scheduler';
import { ConflictBox } from './ConflictBox';
import { fmtDuration, fmtRelative, fmtShort, minToHm } from '../lib/time';
import { DurationPicker, Sheet } from './ui';

const MILESTONES = [
  { at: 0.25, icon: '◔', label: 'Un cuarto' },
  { at: 0.5, icon: '◑', label: 'Mitad' },
  { at: 0.75, icon: '◕', label: 'Casi' },
  { at: 1, icon: '●', label: 'Logrado' },
];

/** Progreso real de un proyecto: cuánto llevas, a qué ritmo y qué viene ahora. */
export function ProjectSheet({
  state,
  task,
  today,
  onClose,
  onEdit,
  onPatch,
  onFix,
  onDelete,
}: {
  state: AppState;
  task: Task;
  today: string;
  onClose: () => void;
  onEdit: (t: Task) => void;
  onPatch: (id: string, patch: TaskPatch) => void;
  onFix: (taskId: string, fix: ConflictFix) => void;
  onDelete: (t: Task) => void;
}) {
  const [notes, setNotes] = useState(task.notes ?? '');
  const [stepTitle, setStepTitle] = useState('');
  const [stepMin, setStepMin] = useState<number | null>(null);
  const steps = task.steps ?? [];
  const setSteps = (next: Step[]) => onPatch(task.id, { steps: next });
  const addStep = () => {
    if (!stepTitle.trim()) return;
    setSteps([...steps, { id: uid(), title: stepTitle.trim(), ...(stepMin ? { minutes: stepMin } : {}) }]);
    setStepTitle('');
    setStepMin(null);
  };
  const plan = stepsPlan(state, task.id, today);
  const whole = task.sessionMinutes >= task.totalMinutes;
  const close = () => {
    if (notes !== (task.notes ?? '')) onPatch(task.id, { notes });
    onClose();
  };
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
    <Sheet title={task.title} onClose={close}>
      <div className="project-detail" style={{ '--cat': taskColor(task) } as CSSProperties}>
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
        {unplaced > 0 && <ConflictBox state={state} taskId={task.id} onFix={onFix} />}

        <div className="pd-section">
          <p className="h3">≡ Pasos</p>
          <p className="muted small">Lo que hay que hacer, en orden. Te los iré sugiriendo en cada sesión.</p>
          {steps.map((st) => {
            const when = [...plan.entries()].find(([, l]) => l.some((x) => x.id === st.id));
            const sess = when ? state.sessions.find((x) => x.id === when[0]) : undefined;
            return (
              <div key={st.id} className={`step-row ${st.done ? 'done' : ''}`}>
                <input type="checkbox" checked={!!st.done} aria-label={`Hecho: ${st.title}`} onChange={() => setSteps(steps.map((x) => (x.id === st.id ? { ...x, done: !x.done } : x)))} />
                <span className="grow">
                  {st.title}
                  <small className="muted">
                    {st.minutes ? ` · ${fmtDuration(st.minutes)}` : ''}
                    {sess && !st.done ? ` · ${fmtRelative(sess.date, today)} ${minToHm(sess.start)}` : ''}
                  </small>
                </span>
                <button className="recurring-x step-x" aria-label={`Quitar ${st.title}`} onClick={() => setSteps(steps.filter((x) => x.id !== st.id))}>
                  ✕
                </button>
              </div>
            );
          })}
          <div className="add-own">
            <input value={stepTitle} placeholder="Nuevo paso: p. ej. «Escanear las láminas»" onChange={(e) => setStepTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addStep()} />
            <button className="btn soft" disabled={!stepTitle.trim()} onClick={addStep}>
              Añadir
            </button>
          </div>
          {stepTitle.trim() && (
            <div className="field">
              <span>¿Cuánto lleva? (opcional)</span>
              <DurationPicker value={stepMin ?? 30} onChange={setStepMin} options={[15, 30, 45, 60, 90, 120]} />
            </div>
          )}
        </div>

        <div className="pd-section">
          <p className="h3">✎ Notas</p>
          <textarea className="note" rows={3} value={notes} placeholder="Ideas, enlaces, cosas a tener en cuenta…" onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (task.notes ?? '') && onPatch(task.id, { notes })} />
        </div>

        <div className="pd-section">
          <p className="h3">⚙ Cómo lo haces</p>
          <div className="segmented two">
            <button className={!whole ? 'on' : ''} onClick={() => onPatch(task.id, { sessionMinutes: Math.min(60, task.totalMinutes) })}>
              Por partes (sesiones)
            </button>
            <button className={whole ? 'on' : ''} onClick={() => onPatch(task.id, { sessionMinutes: task.totalMinutes })}>
              Todo seguido en un día
            </button>
          </div>
          {!whole && (
            <div className="field">
              <span>Sesiones de</span>
              <DurationPicker value={task.sessionMinutes} onChange={(m) => onPatch(task.id, { sessionMinutes: m })} options={[30, 45, 60, 90, 120, 180]} />
            </div>
          )}
          <div className="field">
            <span>¿Qué días?</span>
            <div className="chips">
              {(
                [
                  ['any', 'Cualquier día'],
                  ['weekdays', 'Entre semana'],
                  ['weekends', 'Fines de semana'],
                ] as [DayType, string][]
              ).map(([v, l]) => (
                <button key={v} className={`chip ${(task.dayType ?? 'any') === v ? 'on' : ''}`} onClick={() => onPatch(task.id, { dayType: v })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

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
          ✎ Cambiar horas o fecha
        </button>
        <button className="btn ghost wide danger" onClick={() => onDelete(task)}>
          Eliminar el proyecto
        </button>
      </div>
    </Sheet>
  );
}
