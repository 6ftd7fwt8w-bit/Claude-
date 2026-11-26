import { useEffect, useState } from 'react';
import type { CategoryId, DayType, Task, TaskKind, TimeOfDay } from '../types';
import { catById } from '../types';
import type { NewTaskInput, TaskPatch } from '../lib/scheduler';
import { parseQuick } from '../lib/parse';
import { ROUTINE_ICONS, TIME_OF_DAY_LABEL } from '../lib/suggestions';
import { addDays, fmtDuration, fmtShort, hmToMin, minToHm, todayKey } from '../lib/time';
import { CategoryPicker, DayPicker, DurationPicker, NumberChips, Sheet, TimeMode } from './ui';
import { FreqTabs, type Freq } from './RecurringEditor';

type Mode = TaskKind | 'cotidiana';

const KINDS: { id: Mode; label: string; hint: string }[] = [
  { id: 'flexible', label: '🪴 Proyecto', hint: 'Tú dices cuánto tiempo y para cuándo; yo busco los huecos.' },
  { id: 'evento', label: '📌 Con hora', hint: 'Algo con día y hora fijos (una cena, el médico…).' },
  { id: 'habito', label: '💛 Cuidarte', hint: 'Bienestar o vida social que se repite cada semana.' },
  { id: 'cotidiana', label: '🧺 Cotidiana', hint: 'Lo de siempre: ducha, compra, cocinar… Ocupa tiempo y lo tengo en cuenta.' },
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
  const [mode, setMode] = useState<Mode>(e?.routine ? 'cotidiana' : (e?.kind ?? preset?.kind ?? 'flexible'));
  const kind: TaskKind = mode === 'cotidiana' ? 'habito' : mode;
  const setKind = (k: TaskKind) => setMode((m) => (m === 'cotidiana' && k === 'habito' ? m : k));
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(e?.timeOfDay ?? 'cualquiera');
  const [icon, setIcon] = useState(e?.icon ?? '🧺');
  const [days, setDays] = useState<number[]>(e?.days ?? []);
  const [fixed, setFixed] = useState<number | undefined>(e?.fixedStart);
  const [after, setAfter] = useState<number | undefined>(e?.after);
  const [dayType, setDayType] = useState<DayType>(e?.dayType ?? 'any');
  const [notes, setNotes] = useState(e?.notes ?? '');
  const [freq, setFreq] = useState<Freq>(e?.timesPerMonth ? 'mes' : e?.days?.length ? 'dias' : 'semana');
  const [perMonth, setPerMonth] = useState(e?.timesPerMonth ?? 2);
  const byDays = freq === 'dias';
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
    if (parsed.timesPerWeek) {
      setTimes(parsed.timesPerWeek);
      setFreq('semana');
    }
    if (parsed.timesPerMonth) {
      setPerMonth(parsed.timesPerMonth);
      setFreq('mes');
    }
    if (parsed.category && !touchedCat) setCategory(parsed.category);
  }, [text]);

  // categoría por defecto razonable según el tipo, mientras no la elija la persona
  useEffect(() => {
    if (touchedCat || parsed.category) return;
    setCategory(mode === 'cotidiana' ? 'hogar' : mode === 'habito' ? 'bienestar' : mode === 'evento' ? 'social' : 'proyectos');
  }, [mode]);

  const understood: string[] = [];
  if (parsed.totalMinutes) understood.push(`⏱ ${fmtDuration(parsed.totalMinutes)}`);
  if (parsed.deadline) understood.push(`🎯 antes del ${fmtShort(parsed.deadline)}`);
  if (parsed.date) understood.push(`📅 ${fmtShort(parsed.date)}`);
  if (parsed.start != null) understood.push(`🕐 ${minToHm(parsed.start)}`);
  if (parsed.timesPerWeek) understood.push(`🔁 ${parsed.timesPerWeek}×/semana`);
  if (parsed.timesPerMonth) understood.push(`🔁 ${parsed.timesPerMonth}×/mes`);
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
        timesPerWeek: byDays && days.length ? days.length : times,
        timeOfDay,
        days: kind === 'habito' ? (byDays && days.length ? days : null) : undefined,
        timesPerMonth: kind === 'habito' ? (freq === 'mes' ? perMonth : null) : undefined,
        fixedStart: kind !== 'evento' ? (fixed ?? null) : undefined,
        after: kind !== 'evento' ? (after ?? null) : undefined,
        dayType,
        notes,
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
      timesPerWeek: byDays && days.length ? days.length : times,
      days: byDays && days.length ? days : undefined,
      timesPerMonth: freq === 'mes' ? perMonth : undefined,
      fixedStart: kind !== 'evento' ? fixed : undefined,
      after: kind !== 'evento' ? after : undefined,
      dayType,
      notes,
      routine: mode === 'cotidiana',
      timeOfDay,
      icon: mode === 'cotidiana' ? icon : undefined,
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

      {!e && (
        <div className="segmented four">
          {KINDS.map((k) => (
            <button key={k.id} className={mode === k.id ? 'on' : ''} onClick={() => setMode(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
      )}
      <p className="muted small">{KINDS.find((k) => k.id === mode)?.hint}</p>
      {mode === 'cotidiana' && (
        <div className="field">
          <span>Icono</span>
          <div className="chips icons">
            {ROUTINE_ICONS.map((i) => (
              <button key={i} type="button" className={`chip round ${icon === i ? 'on' : ''}`} onClick={() => setIcon(i)} aria-label={`Icono ${i}`}>
                {i}
              </button>
            ))}
          </div>
        </div>
      )}

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
          <DurationPicker value={total} onChange={setTotal} />
        </div>
      )}

      {kind === 'habito' && (
        <>
          <div className="field">
            <span>¿Cuántas veces?</span>
            <FreqTabs value={freq} onChange={setFreq} />
            {freq === 'dias' && <DayPicker value={days} onChange={setDays} />}
            {freq === 'semana' && (
              <NumberChips value={times} options={[1, 2, 3, 4, 5, 7]} onChange={setTimes} fmt={(v) => (v === 7 ? 'Cada día' : `${v}×/sem`)} />
            )}
            {freq === 'mes' && <NumberChips value={perMonth} options={[1, 2, 3, 4]} onChange={setPerMonth} fmt={(v) => `${v}× al mes`} />}
          </div>
          <div className="field">
            <span>Cada vez</span>
            <DurationPicker value={total} onChange={setTotal} />
            {total <= 20 && <small className="muted">Cabe en tus pausas del trabajo ☕</small>}
          </div>
          <div className="field">
            <span>¿Cuándo te va mejor?</span>
            <div className="chips">
              {(Object.keys(TIME_OF_DAY_LABEL) as TimeOfDay[]).map((t) => (
                <button key={t} type="button" className={`chip ${timeOfDay === t ? 'on' : ''}`} onClick={() => setTimeOfDay(t)}>
                  {TIME_OF_DAY_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {kind !== 'evento' && (
        <>
          <div className="field">
            <span>¿A qué hora?</span>
            <TimeMode
              fixed={fixed}
              after={after}
              onChange={(v) => {
                setFixed(v.fixed);
                setAfter(v.after);
              }}
            />
          </div>
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
                <button key={v} type="button" className={`chip ${dayType === v ? 'on' : ''}`} onClick={() => setDayType(v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <label className="field">
        <span>📝 Notas (opcional)</span>
        <textarea className="note" rows={2} value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="Detalles, enlaces, qué quieres hacer…" />
      </label>

      <button className="btn primary wide" disabled={!title} onClick={submit}>
        {e ? 'Guardar cambios' : kind === 'evento' ? 'Apuntar' : 'Buscar hueco ✨'}
      </button>
    </Sheet>
  );
}
