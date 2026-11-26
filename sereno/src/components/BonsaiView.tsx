import { useState } from 'react';
import type { AppState } from '../types';
import { CATEGORIES } from '../types';
import { monthStats, streak } from '../lib/stats';
import { fmtDuration, fmtMonth, fromKey, monthKey, pad } from '../lib/time';
import { Bonsai } from './Bonsai';

function bonsaiMessage(leaves: number, buds: number): string {
  if (leaves === 0 && buds === 0) return 'Tu bonsái espera su primera hoja. Añade algo que quieras cultivar 🌱';
  if (leaves === 0) return 'Cada cosa que completes será una hoja nueva. ¡A por la primera!';
  if (leaves < 8) return 'Está brotando. Los pequeños progresos también son avances.';
  if (leaves < 25) return 'Crece fuerte y equilibrado. Sigue a tu ritmo.';
  if (leaves < 50) return '¡Qué frondoso! Se nota que te estás cuidando.';
  return 'Un bonsái espléndido. Este mes has cultivado mucho 🌸';
}

export function BonsaiView({ state, today }: { state: AppState; today: string }) {
  const [month, setMonth] = useState(monthKey(today));
  const st = monthStats(state, month);
  const isCurrent = month === monthKey(today);
  const shift = (n: number) => {
    const d = fromKey(`${month}-01`);
    d.setMonth(d.getMonth() + n);
    const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    if (k <= monthKey(today)) setMonth(k);
  };
  const totalMin = Object.values(st.minutesByCat).reduce((a, b) => a + b, 0);
  const maxMin = Math.max(1, ...Object.values(st.minutesByCat));
  const forgotten = CATEGORIES.filter((c) => (c.id === 'social' || c.id === 'bienestar') && st.minutesByCat[c.id] === 0);

  return (
    <div className="view">
      <header className="cal-head">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <div className="center">
          <p className="eyebrow">El bonsái de la vida</p>
          <h1 className="cap">{fmtMonth(month)}</h1>
        </div>
        <button className="icon-btn" onClick={() => shift(1)} disabled={isCurrent} aria-label="Mes siguiente">
          ›
        </button>
      </header>

      <section className="bonsai-stage">
        <Bonsai leaves={st.leaves} buds={isCurrent ? st.buds : 0} flowers={st.roundDays} />
        <p className="bonsai-msg">{bonsaiMessage(st.leaves.length, st.buds)}</p>
        {isCurrent && st.buds > 0 && <p className="muted small">Los puntitos son hojas que aún pueden crecer este mes.</p>}
      </section>

      <div className="stats">
        <div className="stat">
          <strong>{st.leaves.length}</strong>
          <span>hojas</span>
        </div>
        <div className="stat">
          <strong>{st.roundDays}</strong>
          <span>flores · días completos</span>
        </div>
        <div className="stat">
          <strong>{state.drops}</strong>
          <span>gotas 💧</span>
        </div>
        <div className="stat">
          <strong>{streak(state, today)}</strong>
          <span>días seguidos</span>
        </div>
      </div>

      <section className="card">
        <p className="h3">Equilibrio del mes</p>
        <p className="muted small">{totalMin ? `${fmtDuration(totalMin)} dedicadas a lo que te importa` : 'Aún sin datos este mes.'}</p>
        <div className="balance">
          {CATEGORIES.map((c) => (
            <div key={c.id} className="balance-row">
              <span className="balance-label">
                {c.emoji} {c.label}
              </span>
              <span className="balance-bar">
                <span style={{ width: `${(st.minutesByCat[c.id] / maxMin) * 100}%`, background: c.color }} />
              </span>
              <span className="balance-val muted small">{st.minutesByCat[c.id] ? fmtDuration(st.minutesByCat[c.id]) : '—'}</span>
            </div>
          ))}
        </div>
        {isCurrent && totalMin > 0 && forgotten.length > 0 && (
          <p className="tip-inline">
            💛 Este mes aún no hay nada de {forgotten.map((c) => c.label.toLowerCase()).join(' ni de ')}. Tu bonsái crece más bonito con equilibrio.
          </p>
        )}
      </section>
    </div>
  );
}
