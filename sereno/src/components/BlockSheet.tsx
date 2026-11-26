import { useState } from 'react';
import type { Profile } from '../types';
import { mealsFor, workHours } from '../lib/scheduler';
import { fmtDuration, fmtLong, hmToMin, minToHm } from '../lib/time';
import type { Block } from './DayAgenda';
import { DurationPicker, Sheet } from './ui';

/** Tocar un bloque de la rutina: cambiarlo solo ese día, o añadir algo a esa hora. */
export function BlockSheet({
  profile,
  date,
  block,
  minute,
  onOverride,
  onReset,
  onRemovePause,
  onAddAt,
  onOpenRoutine,
  onClose,
}: {
  profile: Profile;
  date: string;
  block: Block;
  minute: number;
  onOverride: (patch: Record<string, number | boolean | undefined>) => void;
  onReset: () => void;
  onRemovePause: (start: number) => void;
  onAddAt: (minute: number) => void;
  onOpenRoutine: () => void;
  onClose: () => void;
}) {
  const meals = mealsFor(profile, date);
  const meal = block.key === 'dinner' ? meals.dinner : meals.lunch;
  const [mStart, setMStart] = useState(meal.start);
  const [mDur, setMDur] = useState(meal.end - meal.start);
  const w = workHours(profile, date) ?? { start: profile.workStart, end: profile.workEnd };
  const [wStart, setWStart] = useState(w.start);
  const [wEnd, setWEnd] = useState(w.end);
  const changed = !!profile.dayOverrides?.[date];

  return (
    <Sheet title={block.label} onClose={onClose}>
      <p className="muted small cap">
        {fmtLong(date)} · {minToHm(block.start)}–{minToHm(block.end)}
      </p>

      {block.kind === 'meal' && (
        <div className="pd-section">
          <p className="h3">✎ Solo este día</p>
          <div className="row2">
            <label className="field">
              <span>Empieza</span>
              <input type="time" value={minToHm(mStart)} onChange={(e) => e.target.value && setMStart(hmToMin(e.target.value))} />
            </label>
          </div>
          <div className="field">
            <span>Hoy me lleva</span>
            <DurationPicker value={mDur} onChange={setMDur} options={[15, 20, 30, 45, 60, 90]} />
          </div>
          <button
            className="btn primary wide"
            onClick={() =>
              onOverride(block.key === 'dinner' ? { dinner: mStart, dinnerDuration: mDur } : { lunch: mStart, lunchDuration: mDur })
            }
          >
            Guardar para este día ({fmtDuration(mDur)})
          </button>
        </div>
      )}

      {(block.kind === 'work' || block.kind === 'commute') && (
        <div className="pd-section">
          <p className="h3">✎ Solo este día</p>
          <p className="muted small">Si hoy has trabajado más (o menos), cámbialo y recoloco lo que choque.</p>
          <div className="row2">
            <label className="field">
              <span>Empecé / empiezo</span>
              <input type="time" value={minToHm(wStart)} onChange={(e) => e.target.value && setWStart(hmToMin(e.target.value))} />
            </label>
            <label className="field">
              <span>Terminé / termino</span>
              <input type="time" value={minToHm(wEnd)} onChange={(e) => e.target.value && setWEnd(hmToMin(e.target.value))} />
            </label>
          </div>
          <button className="btn primary wide" disabled={wEnd <= wStart} onClick={() => onOverride({ workStart: wStart, workEnd: wEnd, noWork: undefined })}>
            Guardar para este día ({fmtDuration(Math.max(0, wEnd - wStart))})
          </button>
          <button className="btn soft wide" onClick={() => onOverride({ noWork: true })}>
            ○ Hoy no trabajo
          </button>
        </div>
      )}

      {block.kind === 'pause' && (
        <button className="btn soft wide" onClick={() => onRemovePause(block.start)}>
          Hoy no tengo esta pausa
        </button>
      )}

      {(block.kind === 'routine' || block.kind === 'relax') && (
        <p className="muted small">
          Este bloque sale de tu rutina (hora de despertar, de dormir, desconexión). Se cambia en{' '}
          <button className="link" onClick={onOpenRoutine}>
            Rutina
          </button>
          .
        </p>
      )}

      <button className="btn soft wide" onClick={() => onAddAt(minute)}>
        + Añadir algo a las {minToHm(minute)}
      </button>
      {changed && (
        <button className="btn ghost wide" onClick={onReset}>
          ↩︎ Volver a mi rutina de siempre este día
        </button>
      )}
    </Sheet>
  );
}
