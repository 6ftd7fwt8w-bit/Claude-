import type { CSSProperties } from 'react';
import type { AppState, Task } from '../types';
import { catById } from '../types';
import { doneMinutes, firstPlanned } from '../lib/scheduler';
import { addDays, diffDays, fmtDuration, fmtRelative, fmtShort, minToHm, weekStart } from '../lib/time';

export function GoalsView({ state, today, onArchive }: { state: AppState; today: string; onArchive: (t: Task) => void }) {
  const active = state.tasks.filter((t) => !t.archived);
  const flex = active.filter((t) => t.kind === 'flexible').sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
  const habits = active.filter((t) => t.kind === 'habito');
  const events = active
    .filter((t) => t.kind === 'evento' && (t.date ?? '') >= today)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.start ?? 0) - (b.start ?? 0));
  const ws = weekStart(today);
  const we = addDays(ws, 6);

  return (
    <div className="view">
      <header>
        <p className="eyebrow">Lo que estás cultivando</p>
        <h1>Objetivos</h1>
      </header>

      {active.length === 0 && <p className="empty">Aún no hay objetivos. Pulsa + y cuéntame qué quieres conseguir 🌱</p>}

      {flex.length > 0 && <h2 className="section-title">Proyectos y tareas</h2>}
      {flex.map((t) => {
        const done = doneMinutes(state, t.id);
        const pct = Math.min(1, done / t.totalMinutes);
        const next = firstPlanned(state, t.id, today);
        const left = state.unplaced[t.id];
        const finished = pct >= 1;
        return (
          <section key={t.id} className="card goal" style={{ '--cat': catById(t.category).color } as CSSProperties}>
            <div className="goal-head">
              <span className="goal-emoji">{finished ? '🏆' : catById(t.category).emoji}</span>
              <div className="grow">
                <p className="h3">{t.title}</p>
                <p className="muted small">
                  {fmtDuration(done)} de {fmtDuration(t.totalMinutes)}
                  {t.deadline && ` · vence ${fmtRelative(t.deadline, today)}${diffDays(today, t.deadline) > 6 ? ` (${diffDays(today, t.deadline)} días)` : ''}`}
                </p>
              </div>
              <button className="icon-btn" aria-label={`Archivar ${t.title}`} onClick={() => onArchive(t)}>
                🗑
              </button>
            </div>
            <div className="bar">
              <span style={{ width: `${pct * 100}%` }} />
            </div>
            {finished && <p className="small">¡Conseguido! Pequeños progresos, grandes logros ✨</p>}
            {!finished && next && (
              <p className="small">
                Siguiente: {fmtRelative(next.date, today)} a las {minToHm(next.start)}
              </p>
            )}
            {left > 0 && (
              <p className="warn small">
                ⚠️ Faltan {fmtDuration(left)} que no caben antes del {t.deadline ? fmtShort(t.deadline) : 'plazo'}. ¿Ampliamos la fecha o reducimos horas?
              </p>
            )}
          </section>
        );
      })}

      {habits.length > 0 && <h2 className="section-title">Hábitos de equilibrio</h2>}
      {habits.map((t) => {
        const week = state.sessions.filter((s) => s.taskId === t.id && s.date >= ws && s.date <= we);
        const doneW = week.filter((s) => s.status === 'done').length;
        return (
          <section key={t.id} className="card goal" style={{ '--cat': catById(t.category).color } as CSSProperties}>
            <div className="goal-head">
              <span className="goal-emoji">{catById(t.category).emoji}</span>
              <div className="grow">
                <p className="h3">{t.title}</p>
                <p className="muted small">
                  {fmtDuration(t.totalMinutes)} · {t.timesPerWeek}× por semana
                </p>
              </div>
              <button className="icon-btn" aria-label={`Archivar ${t.title}`} onClick={() => onArchive(t)}>
                🗑
              </button>
            </div>
            <div className="pips">
              {Array.from({ length: t.timesPerWeek ?? 1 }, (_, i) => (
                <span key={i} className={i < doneW ? 'on' : ''} />
              ))}
              <span className="muted small">esta semana</span>
            </div>
          </section>
        );
      })}

      {events.length > 0 && <h2 className="section-title">Próximas citas</h2>}
      {events.map((t) => (
        <section key={t.id} className="card goal row" style={{ '--cat': catById(t.category).color } as CSSProperties}>
          <span className="goal-emoji">{catById(t.category).emoji}</span>
          <div className="grow">
            <p className="h3">{t.title}</p>
            <p className="muted small">
              {fmtRelative(t.date!, today)} a las {minToHm(t.start ?? 0)} · {fmtDuration(t.totalMinutes)}
            </p>
          </div>
          <button className="icon-btn" aria-label={`Quitar ${t.title}`} onClick={() => onArchive(t)}>
            🗑
          </button>
        </section>
      ))}
    </div>
  );
}
