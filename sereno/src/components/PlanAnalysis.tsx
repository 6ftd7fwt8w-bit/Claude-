import { useEffect, useState } from 'react';
import type { Profile, ValueGoal } from '../types';
import { areaInfo, monthlyHours } from '../lib/values';
import type { NewTaskInput } from '../lib/scheduler';
import { DISCLAIMER, analyzePlan } from '../lib/mind';
import { fmtDuration } from '../lib/time';

const STEP_MS = 1100;

/**
 * Paso final de la encuesta: Sereno "analiza" tu semana y explica qué hace y por qué.
 * Cada línea es real: corresponde a algo que el planificador hace con tus datos.
 */
export function PlanAnalysisView({
  profile,
  tasks,
  values,
  addRecharge,
  setAddRecharge,
}: {
  profile: Profile;
  tasks: NewTaskInput[];
  values: ValueGoal[];
  addRecharge: boolean;
  setAddRecharge: (v: boolean) => void;
}) {
  const base = analyzePlan(profile, tasks);
  const top = [...values].sort((x, y) => monthlyHours(y) - monthlyHours(x)).slice(0, 3);
  const a = {
    ...base,
    steps: [
      ...base.steps.slice(0, 2),
      {
        icon: '◈',
        doing: 'Repartiendo tu tiempo según tus valores…',
        result: values.length
          ? `Tus prioridades: ${top.map((g) => `${areaInfo(g.area).emoji} ${areaInfo(g.area).label.toLowerCase()} ${g.hours} h/${g.per === 'semana' ? 'sem' : 'mes'}`).join(', ')}. Reservaré tiempo para cada una.`
          : 'Sin valores definidos: podrás añadirlos cuando quieras en la pestaña Valores.',
      },
      ...base.steps.slice(2),
    ],
  };
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [done, setDone] = useState(reduced ? a.steps.length : 0);
  useEffect(() => {
    if (done >= a.steps.length) return;
    const t = setTimeout(() => setDone((d) => d + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [done, a.steps.length]);
  const finished = done >= a.steps.length;
  const pct = Math.round((done / a.steps.length) * 100);

  return (
    <div className="analysis">
      <div className="analysis-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
      <p className="analysis-status">{finished ? 'Análisis completado' : a.steps[done].doing}</p>

      <ol className="analysis-steps">
        {a.steps.map((s, i) => (
          <li key={s.doing} className={i < done ? 'done' : i === done ? 'current' : 'next'}>
            <span className="as-icon">{i < done ? '✓' : i === done ? <i className="spinner" /> : s.icon}</span>
            <span className="as-text">{i < done ? s.result : s.doing}</span>
          </li>
        ))}
      </ol>

      {finished && (
        <div className="analysis-result">
          <p className="ar-title">Tu plan de máximo potencial</p>
          <div className="ar-nums">
            <div>
              <strong>{fmtDuration(a.weekFree)}</strong>
              <span>libres / semana</span>
            </div>
            <div>
              <strong>{fmtDuration(a.focusPerWeek)}</strong>
              <span>de foco</span>
            </div>
            <div>
              <strong>{fmtDuration(a.rechargePerWeek + (addRecharge && a.suggestRecharge ? 50 : 0))}</strong>
              <span>de recarga</span>
            </div>
          </div>
          {a.suggestRecharge && (
            <label className={`recommend ${addRecharge ? 'on' : ''}`}>
              <input type="checkbox" checked={addRecharge} onChange={(e) => setAddRecharge(e.target.checked)} />
              <span>
                <strong>Recomendado: 10 min de recarga, 5 días a la semana</strong>
                <small>Respirar o un paseo corto. Con la mente descansada, el foco y las ideas llegan mejor.</small>
              </span>
            </label>
          )}
          <p className="ar-motto">Con la mente tranquila llegas más lejos. Yo me encargo del equilibrio; tú, de avanzar.</p>
          <p className="disclaimer">{DISCLAIMER}</p>
        </div>
      )}
    </div>
  );
}
