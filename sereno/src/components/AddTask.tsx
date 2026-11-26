import { useEffect, useState } from 'react';
import type { CategoryId, Task, TaskKind } from '../types';
import { catById } from '../types';
import type { NewTaskInput, TaskPatch } from '../lib/scheduler';
import { parseQuick } from '../lib/parse';
import { addDays, fmtDuration, fmtShort, hmToMin, minToHm, todayKey } from '../lib/time';
import { CategoryPicker, NumberChips, Sheet } from './ui';

const KINDS: { id: TaskKind; label: string; hint: string }[] = [
  { id: 'flexible', label: '🪴 Objetivo', hint: 'Tú dices cuánto tiempo y para cuándo; yo busco los huecos.' },
  { id: 'evento', label: '📌 Con hora', hint: 'Algo con día y hora fijos (una cena, el médico…).' },
  { id: 'habito', label: '🔁 Hábito', hint: 'Se repite cada semana. Lo coloco en días distintos.' },
];

export interface AddPreset {
  title?: string;
  category?: CategoryId;
  kind?: TaskKind;
  minutes?: number;
}

export function AddTask({
  onAdd,
  onEdit,
  onClose,
  preset,
  editing,
}: {
  onAdd: (t: NewTaskInput) => void;
  onEdit?: (id: string, patch: TaskPatch) => void;
  onClose: () => void;
  preset?: AddPreset;
  editing?: Task;
}) {
  const today = todayKey();
  const e = editing;
  const [text, setText] = useState(e?.title ?? preset?.title ?? '');
  const [kind, setKind] = useState<TaskKind>(e?.kind ?? preset?.kind ?? 'flexible');
  const [category, setCategory] = useState<CategoryId>(e?.category ?? preset?.category ?? 'proyectos');
  const [total, setTotal] = useState(e?.totalMinutes ?? preset?.minutes ?? 120);
  const [session, setSession] = useState(e?.sessionMinutes ?? 60);
  const [deadline, setDeadline] = useState<string>(e?.deadline ?? addDays(today, 7));
  const [hasDeadline, setHasDeadline] = useState(e ? !!e.deadline : true);
  const [date, setDate] = useState(e?.date ?? today);
  const [start, setStart] = useState(e?.start ?? 19 * 60);
  const [times, setTimes] = useState(e?.timesPerWeek ?? 3);
  const [touchedCat, setTouchedCat] = useState(!!preset?.category || !!e);
  const [typed, setTyped] = useState(false);

  const parsed = parseQuick(text, today);

  // lo que se entiende del texto rellena el formulario (al editar, solo si se reescribe)
  useEffect(() => {
    if (e && !typed) return;
    if (parsed.kind) setKind(parsed.kind);
    if (parsed.totalMinutes) setTotal(parsed.totalMinutes);
    if (parsed.deadline) {
      setDeadline(parsed.deadline);
      setHasDeadline(true);
    }
    if (parsed.date) setDate(parsed.date);
    if (parsed.start != null) setStart(parsed.start);
    if (parsed.timesPerWeek) setTimes(parsed.timesPerWeek);
    if (parsed.category && !touchedCat) setCategory(parsed.category);
  }, [text]);

  const understood: string[] = [];
  if (parsed.totalMinutes) understood.push(`⏱ ${fmtDuration(parsed.totalMinutes)}`);
  if (parsed.deadline) understood.push(`🎯 antes del ${fmtShort(parsed.deadline)}`);
  if (parsed.date) understood.push(`📅 ${fmtShort(parsed.date)}`);
  if (parsed.start != null) understood.push(`🕐 ${minToHm(parsed.start)}`);
  if (parsed.timesPerWeek) understood.push(`🔁 ${parsed.timesPerWeek}×/semana`);
  if (parsed.category) understood.push(`${catById(parsed.category).emoji} ${catById(parsed.category).label}`);

  const title = e && !typed ? text.trim() : parsed.title || text.trim();
  const submit = () => {
    if (!title) return;
    if (e && onEdit) {
      onEdit(e.id, {
        title,
        category,
        totalMinutes: total,
        sessionMinutes: Math.min(session, total),
        deadline: kind === 'flexible' ? (hasDeadline ? deadline : null) : undefined,
        date,
        start,
        timesPerWeek: times,
      });
      return;
    }
    onAdd({
      title,
      category,
      kind,
      totalMinutes: total,
      sessionMinutes: Math.min(session, total),
      deadline: kind === 'flexible' && hasDeadline ? deadline : undefined,
      date,
      start,
      timesPerWeek: times,
    });
  };

  return (
    <Sheet title={e ? 'Editar' : '¿Qué quieres conseguir?'} onClose={onClose}>
      <label className="field">
        <span className="sr-only">Descripción</span>
        <input
          autoFocus
          className="quick-input"
          value={text}
          placeholder="Ej.: Proyecto personal 10h antes del 15/12"
          onChange={(ev) => {
            setText(ev.target.value);
            setTyped(true);
          }}
          onKeyDown={(ev) => ev.key === 'Enter' && submit()}
        />
      </label>
      {understood.length > 0 && (!e || typed) && (
        <div className="understood">
          <span className="muted small">Entendido:</span> {understood.map((u) => <span key={u} className="tag">{u}</span>)}
        </div>
      )}

      {!e && <div className="segmented">
        {KINDS.map((k) => (
          <button key={k.id} className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>
            {k.label}
          </button>
        ))}
      </div>}
      <p className="muted small">{KINDS.find((k) => k.id === kind)?.hint}</p>

      <div className="field">
        <span>Tipo</span>
        <CategoryPicker
          value={category}
          onChange={(c) => {
            setCategory(c);
            setTouchedCat(true);
          }}
        />
      </div>

      {kind === 'flexible' && (
        <>
          <div className="field">
            <span>Tiempo total</span>
            <NumberChips value={total} options={[30, 60, 120, 300, 600, 1200]} onChange={setTotal} fmt={fmtDuration} />
            <input
              type="range"
              min={15}
              max={3000}
              step={15}
              value={total}
              onChange={(ev) => setTotal(Number(ev.target.value))}
              aria-label="Tiempo total"
            />
            <small className="muted">{fmtDuration(total)}</small>
          </div>
          <div className="field">
            <span>Sesiones de</span>
            <NumberChips value={session} options={[25, 45, 60, 90, 120]} onChange={setSession} fmt={fmtDuration} />
          </div>
          <div className="field">
            <label className="toggle">
              <input type="checkbox" checked={hasDeadline} onChange={(ev) => setHasDeadline(ev.target.checked)} />
              <span>Tiene fecha límite</span>
            </label>
            {hasDeadline && <input type="date" value={deadline} min={today} onChange={(ev) => ev.target.value && setDeadline(ev.target.value)} />}
          </div>
        </>
      )}

      {kind === 'evento' && (
        <div className="row2">
          <label className="field">
            <span>Día</span>
            <input type="date" value={date} onChange={(ev) => ev.target.value && setDate(ev.target.value)} />
          </label>
          <label className="field">
            <span>Hora</span>
            <input type="time" value={minToHm(start)} onChange={(ev) => ev.target.value && setStart(hmToMin(ev.target.value))} />
          </label>
        </div>
      )}
      {kind === 'evento' && (
        <div className="field">
          <span>Duración</span>
          <NumberChips value={total} options={[30, 60, 90, 120, 180]} onChange={setTotal} fmt={fmtDuration} />
        </div>
      )}

      {kind === 'habito' && (
        <>
          <div className="field">
            <span>Veces por semana</span>
            <NumberChips value={times} options={[1, 2, 3, 4, 5, 7]} onChange={setTimes} fmt={(v) => `${v}×`} />
          </div>
          <div className="field">
            <span>Cada vez</span>
            <NumberChips value={total} options={[10, 20, 30, 45, 60, 90]} onChange={setTotal} fmt={fmtDuration} />
          </div>
        </>
      )}

      <button className="btn primary wide" disabled={!title} onClick={submit}>
        {e ? 'Guardar cambios' : kind === 'evento' ? 'Apuntar' : 'Buscar hueco ✨'}
      </button>
    </Sheet>
  );
}
