import type { CSSProperties } from 'react';
import type { ValueGoal } from '../types';
import { catById } from '../types';
import { AREAS, VISIONS, goalsFromVision, guidelineWarning, monthlyHours } from '../lib/values';
import { DISCLAIMER } from '../lib/mind';
import { CatIcon, Icon, type IconName } from './Icons';

const VISION_ICON: Record<string, IconName> = { yo: 'person', proyectos: 'proyectos', familia: 'familia', equilibrio: 'balance' };

/** Elige una visión de vida y ajusta cuántas horas quieres dedicar a cada área. */
export function ValuesEditor({
  vision,
  goals,
  onChange,
}: {
  vision?: string;
  goals: ValueGoal[];
  onChange: (goals: ValueGoal[], vision?: string) => void;
}) {
  const goalOf = (id: ValueGoal['area']) => goals.find((g) => g.area === id);
  const setGoal = (g: ValueGoal) => onChange([...goals.filter((x) => x.area !== g.area), g].filter((x) => x.hours > 0), vision);
  return (
    <div className="values-editor">
      <p className="muted">
        ¿Cómo quieres vivir esta etapa? Elige una visión y te propongo cuántas horas dedicar a cada cosa. Después ajústalo a tu gusto.
      </p>
      <div className="visions">
        {VISIONS.map((v) => (
          <button key={v.id} type="button" className={`vision ${vision === v.id ? 'on' : ''}`} onClick={() => onChange(goalsFromVision(v), v.id)}>
            <span className="vision-emoji"><Icon name={VISION_ICON[v.id] ?? 'balance'} size={26} /></span>
            <strong>{v.title}</strong>
            <span className="muted small">{v.description}</span>
          </button>
        ))}
      </div>

      <p className="h3 values-sub">Tus prioridades</p>
      <div className="value-rows">
        {AREAS.map((a) => {
          const g = goalOf(a.id) ?? { area: a.id, hours: 0, per: 'mes' as const };
          const warn = g.hours > 0 ? guidelineWarning(g) : undefined;
          return (
            <div key={a.id} className={`value-row ${g.hours ? 'on' : ''}`} style={{ '--cat': catById(a.id).color } as CSSProperties}>
              <div className="vr-top">
                <CatIcon cat={a.id} size={34} />
                <strong className="grow">{a.label}</strong>
                <div className="stepper small-stepper">
                  <button type="button" aria-label={`Menos horas de ${a.label}`} onClick={() => setGoal({ ...g, hours: Math.max(0, g.hours - 1) })}>
                    −
                  </button>
                  <strong>{g.hours ? `${g.hours} h` : '—'}</strong>
                  <button type="button" aria-label={`Más horas de ${a.label}`} onClick={() => setGoal({ ...g, hours: g.hours + 1 })}>
                    +
                  </button>
                </div>
                <div className="per-toggle">
                  <button
                    type="button"
                    className={g.per === 'semana' ? 'on' : ''}
                    onClick={() => g.per !== 'semana' && setGoal({ ...g, per: 'semana', hours: g.hours ? Math.max(1, Math.round(g.hours / 4.3)) : 0 })}
                  >
                    /sem
                  </button>
                  <button
                    type="button"
                    className={g.per === 'mes' ? 'on' : ''}
                    onClick={() => g.per !== 'mes' && setGoal({ ...g, per: 'mes', hours: Math.round(g.hours * 4.3) })}
                  >
                    /mes
                  </button>
                </div>
              </div>
              {g.hours > 0 && g.per === 'semana' && <p className="vr-note muted small">≈ {Math.round(monthlyHours(g))} h al mes</p>}
              {warn && <p className="vr-note warn small">! {warn}</p>}
              <details className="vr-why">
                <summary>¿Por qué importa?</summary>
                <p>{a.guideline}</p>
              </details>
            </div>
          );
        })}
      </div>
      <p className="disclaimer">
        Las pautas resumen recomendaciones y estudios conocidos; adáptalas a tu vida. {DISCLAIMER}
      </p>
    </div>
  );
}
