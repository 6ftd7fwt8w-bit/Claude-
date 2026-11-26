import { useState, type CSSProperties } from 'react';
import type { AppState, Task } from '../types';
import { CATEGORIES, catById } from '../types';
import { projectStatus, type TaskPatch } from '../lib/scheduler';
import { RecurringEditor } from './RecurringEditor';
import { HABIT_SUGGESTIONS, ROUTINE_SUGGESTIONS, TIME_OF_DAY_LABEL, timesLabel, type RecurringSuggestion } from '../lib/suggestions';
import { addDays, diffDays, fmtDuration, fmtRelative, minToHm, monthEnd, weekStart } from '../lib/time';

function RecurringSection({
  title,
  hint,
  state,
  today,
  items,
  suggestions,
  onEdit,
  onArchive,
  onQuickAdd,
}: {
  title: string;
  hint: string;
  state: AppState;
  today: string;
  items: Task[];
  suggestions: RecurringSuggestion[];
  onEdit: (t: Task) => void;
  onArchive: (t: Task) => void;
  onQuickAdd: (s: RecurringSuggestion) => void;
}) {
  const ws = weekStart(today);
  const we = addDays(ws, 6);
  const missing = suggestions.filter((s) => !items.some((t) => t.title.toLowerCase() === s.title.toLowerCase()));
  return (
    <>
      <h2 className="section-title">{title}</h2>
      <p className="muted small section-hint">{hint}</p>
      {items.length > 0 && (
        <div className="recurring-grid">
          {items.map((t) => {
            // los mensuales se cuentan en el mes; el resto, en la semana
            const from = t.timesPerMonth ? `${today.slice(0, 7)}-01` : ws;
            const to = t.timesPerMonth ? monthEnd(today) : we;
            const period = state.sessions.filter((s) => s.taskId === t.id && s.date >= from && s.date <= to);
            const doneW = period.filter((s) => s.status === 'done').length;
            const target = t.timesPerMonth ?? t.timesPerWeek ?? 1;
            return (
              <div key={t.id} className="recurring" style={{ '--cat': catById(t.category).color } as CSSProperties}>
                <button className="recurring-main" onClick={() => onEdit(t)} aria-label={`Editar ${t.title}`}>
                  <span className="tile-icon">{t.icon ?? catById(t.category).emoji}</span>
                  <span className="tile-title">{t.title}</span>
                  <span className="tile-meta">
                    {fmtDuration(t.totalMinutes)} · {timesLabel(target, t.days, t.timesPerMonth)}
                    {t.timeOfDay ? ` · ${TIME_OF_DAY_LABEL[t.timeOfDay].split(' ')[1].toLowerCase()}` : ''}
                  </span>
                  <span className="pips small-pips">
                    {Array.from({ length: Math.min(7, target) }, (_, i) => (
                      <span key={i} className={i < doneW ? 'on' : ''} />
                    ))}
                  </span>
                </button>
                <button className="recurring-x" aria-label={`Quitar ${t.title}`} onClick={() => onArchive(t)}>
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
      {missing.length > 0 && (
        <div className="quick-add">
          <span className="muted small">Añadir de un toque:</span>
          <div className="chips">
            {missing.map((s) => (
              <button key={s.title} className="chip add" onClick={() => onQuickAdd(s)}>
                {s.icon} {s.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function GoalsView({
  state,
  today,
  onArchive,
  onEdit,
  onOpen,
  onQuickAdd,
  onPatch,
  onCompleteTask,
}: {
  state: AppState;
  today: string;
  onArchive: (t: Task) => void;
  onEdit: (t: Task) => void;
  onOpen: (t: Task) => void;
  onQuickAdd: (s: RecurringSuggestion, routine: boolean) => void;
  onPatch: (id: string, patch: TaskPatch) => void;
  onCompleteTask: (t: Task) => void;
}) {
  const [tuning, setTuning] = useState<Task | null>(null);
  const active = state.tasks.filter((t) => !t.archived);
  const allFlex = active.filter((t) => t.kind === 'flexible').sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
  // lo corto (≤ 1 h) son tareas sueltas; lo largo, proyectos con su progreso
  const isDone = (t: Task) => projectStatus(state, t.id, today).pct >= 1;
  const flex = allFlex.filter((t) => t.totalMinutes > 60);
  const loose = allFlex.filter((t) => t.totalMinutes <= 60);
  const looseByCat = CATEGORIES.map((c) => ({ c, items: loose.filter((t) => t.category === c.id) })).filter((g) => g.items.length);
  const routines = active.filter((t) => t.kind === 'habito' && t.routine);
  const CARE = ['bienestar', 'social', 'autocuidado'];
  const habits = active.filter((t) => t.kind === 'habito' && !t.routine && CARE.includes(t.category));
  const periodic = active.filter((t) => t.kind === 'habito' && !t.routine && !CARE.includes(t.category));
  const events = active
    .filter((t) => t.kind === 'evento' && (t.date ?? '') >= today)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.start ?? 0) - (b.start ?? 0));

  return (
    <div className="view">
      <header>
        <p className="eyebrow">Lo que estás cultivando</p>
        <h1>Objetivos</h1>
      </header>

      {loose.length > 0 && (
        <>
          <h2 className="section-title">📝 Tareas sueltas</h2>
          {looseByCat.map(({ c, items }) => (
            <section key={c.id} className="card loose-group" style={{ '--cat': c.color } as CSSProperties}>
              <p className="loose-head">
                {c.emoji} {c.label}
              </p>
              {items.map((t) => {
                const done = isDone(t);
                const next = projectStatus(state, t.id, today).next;
                const late = t.deadline && t.deadline < today && !done;
                return (
                  <div key={t.id} className={`loose-row ${done ? 'done' : ''}`}>
                    <button className={`check small-check ${done ? 'on' : ''}`} aria-label={`Hecho: ${t.title}`} disabled={done || !next} onClick={() => onCompleteTask(t)}>
                      {done ? '✓' : ''}
                    </button>
                    <button className="loose-main" onClick={() => onEdit(t)}>
                      <span className="loose-title">{t.title}</span>
                      <span className={`loose-meta ${late ? 'warn' : ''}`}>
                        {done
                          ? 'Hecha ✨'
                          : [
                              fmtDuration(t.totalMinutes),
                              t.deadline ? `para ${fmtRelative(t.deadline, today).replace(/^el /, 'el ')}` : 'sin prisa',
                              next ? `→ ${fmtRelative(next.date, today)} ${minToHm(next.start)}` : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                      </span>
                    </button>
                    <button className="recurring-x" aria-label={`Quitar ${t.title}`} onClick={() => onArchive(t)}>
                      ✕
                    </button>
                  </div>
                );
              })}
            </section>
          ))}
        </>
      )}

      <h2 className="section-title">✨ Proyectos</h2>
      {flex.length === 0 && (
        <p className="empty small-empty">
          Aún no hay proyectos. Pulsa <strong>+</strong> y escribe algo como «Trabajar en las láminas 10h antes del 31/12».
        </p>
      )}
      <div className="project-cards">
        {flex.map((t) => {
          const st = projectStatus(state, t.id, today);
          const days = t.deadline ? diffDays(today, t.deadline) : null;
          return (
            <button key={t.id} className={`card project-card mood-${st.mood}`} style={{ '--cat': catById(t.category).color } as CSSProperties} onClick={() => onOpen(t)}>
              <span className="project-stage">{st.stage}</span>
              <span className="grow">
                <span className="h3 project-title">{t.title}</span>
                <span className="bar">
                  <span style={{ width: `${st.pct * 100}%` }} />
                  {st.expected != null && st.pct < 1 && <i className="bar-expected" style={{ left: `${st.expected * 100}%` }} />}
                </span>
                <span className="project-meta">
                  <strong>{Math.round(st.pct * 100)}%</strong> · {fmtDuration(st.done)} de {fmtDuration(st.total)}
                  {days != null && st.pct < 1 && ` · ${days < 0 ? 'fecha pasada' : days === 0 ? 'vence hoy' : `quedan ${days} días`}`}
                </span>
                <span className="project-phrase">{st.phrase}</span>
              </span>
              <span className="chev">›</span>
            </button>
          );
        })}
      </div>

      <RecurringSection
        title="🧺 Lo de cada día"
        hint="Tareas cotidianas: ocupan tiempo real y las tengo en cuenta al planificar."
        state={state}
        today={today}
        items={routines}
        suggestions={ROUTINE_SUGGESTIONS}
        onEdit={setTuning}
        onArchive={onArchive}
        onQuickAdd={(s) => onQuickAdd(s, true)}
      />

      <RecurringSection
        title="💛 Para cuidarte"
        hint="Bienestar y vida social: lo coloco cada semana para que no se te olvide vivir."
        state={state}
        today={today}
        items={habits}
        suggestions={HABIT_SUGGESTIONS}
        onEdit={setTuning}
        onArchive={onArchive}
        onQuickAdd={(s) => onQuickAdd(s, false)}
      />

      {tuning && (
        <RecurringEditor
          value={{
            title: tuning.title,
            icon: tuning.icon ?? catById(tuning.category).emoji,
            category: tuning.category,
            minutes: tuning.totalMinutes,
            times: tuning.timesPerWeek ?? 1,
            perMonth: tuning.timesPerMonth,
            timeOfDay: tuning.timeOfDay ?? 'cualquiera',
            days: tuning.days,
          }}
          onClose={() => setTuning(null)}
          onRemove={() => {
            onArchive(tuning);
            setTuning(null);
          }}
          onSave={(v) => {
            onPatch(tuning.id, {
              title: v.title,
              icon: v.icon,
              totalMinutes: v.minutes,
              timesPerWeek: v.times,
              timesPerMonth: v.perMonth ?? null,
              timeOfDay: v.timeOfDay,
              days: v.days?.length ? v.days : null,
            });
            setTuning(null);
          }}
        />
      )}

      {periodic.length > 0 && (
        <RecurringSection
          title="🔁 Se repite"
          hint="Gestiones y tareas periódicas: cada semana o cada mes."
          state={state}
          today={today}
          items={periodic}
          suggestions={[]}
          onEdit={setTuning}
          onArchive={onArchive}
          onQuickAdd={(s) => onQuickAdd(s, false)}
        />
      )}

      {events.length > 0 && <h2 className="section-title">📌 Próximas citas</h2>}
      {events.map((t) => (
        <section key={t.id} className="card goal row" style={{ '--cat': catById(t.category).color } as CSSProperties}>
          <span className="goal-emoji">{catById(t.category).emoji}</span>
          <div className="grow">
            <p className="h3">
              {t.title}
              {t.source && <span title="De tu calendario"> 📅</span>}
            </p>
            <p className="muted small">
              {fmtRelative(t.date!, today)} a las {minToHm(t.start ?? 0)} · {fmtDuration(t.totalMinutes)}
            </p>
          </div>
          <button className="icon-btn" aria-label={`Editar ${t.title}`} onClick={() => onEdit(t)}>
            ✏️
          </button>
          <button className="icon-btn" aria-label={`Quitar ${t.title}`} onClick={() => onArchive(t)}>
            🗑
          </button>
        </section>
      ))}
    </div>
  );
}
