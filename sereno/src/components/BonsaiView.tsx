import { useState } from 'react';
import type { AppState } from '../types';
import { CATEGORIES } from '../types';
import { monthStats, streak } from '../lib/stats';
import { fmtDuration, fmtMonth, fmtShort, fromKey, monthKey, pad } from '../lib/time';
import { ACHIEVEMENTS, SHOP, owns, recentJournal, seasonFor, type Slot } from '../lib/rewards';
import { Bonsai } from './Bonsai';
import { Sheet } from './ui';
import { CatMark } from './Icons';

function bonsaiMessage(leaves: number, buds: number): string {
  if (leaves === 0 && buds === 0) return 'Tu bonsái espera su primera hoja. Añade algo que quieras cultivar 🌱';
  if (leaves === 0) return 'Cada cosa que completes será una hoja nueva. ¡A por la primera!';
  if (leaves < 8) return 'Está brotando. Los pequeños progresos también son avances.';
  if (leaves < 25) return 'Crece fuerte y equilibrado. Sigue a tu ritmo.';
  if (leaves < 50) return '¡Qué frondoso! Se nota que te estás cuidando.';
  return 'Un bonsái espléndido. Este mes has cultivado mucho 🌸';
}

const SLOT_TITLES: Record<Slot, string> = {
  season: 'Estación',
  pot: 'Maceta',
  scene: 'Paisaje',
  extras: 'Detalles',
};

export function BonsaiView({ state, today, onBuy }: { state: AppState; today: string; onBuy: (id: string) => void }) {
  const [month, setMonth] = useState(monthKey(today));
  const [shop, setShop] = useState(false);
  const eq = state.equipped;
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
        <Bonsai
          leaves={st.leaves}
          buds={isCurrent ? st.buds : 0}
          flowers={st.roundDays}
          season={seasonFor(eq, `${month}-15`)}
          pot={eq.pot}
          scene={eq.scene}
          extras={eq.extras}
        />
        <p className="bonsai-msg">{bonsaiMessage(st.leaves.length, st.buds)}</p>
        {isCurrent && st.buds > 0 && <p className="muted small">Los puntitos son hojas que aún pueden crecer este mes.</p>}
        <button className="btn soft" onClick={() => setShop(true)}>
          🛍️ Decorar tu bonsái · {state.drops} 💧
        </button>
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
                <CatMark cat={c.id} /> {c.label}
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

      <section className="card">
        <p className="h3">Logros</p>
        <p className="muted small">
          {state.seenAchievements.length} de {ACHIEVEMENTS.length} · cada logro regala gotas
        </p>
        <div className="achievements">
          {ACHIEVEMENTS.map((a) => {
            const got = state.seenAchievements.includes(a.id);
            return (
              <div key={a.id} className={`achievement ${got ? 'on' : ''}`} title={a.description}>
                <span className="ach-emoji">{got ? a.emoji : '🔒'}</span>
                <span className="ach-name">{a.name}</span>
                <span className="ach-desc">{a.description}</span>
              </div>
            );
          })}
        </div>
      </section>

      {recentJournal(state, today).length > 0 && (
        <section className="card">
          <p className="h3">📖 Tu diario de gratitud</p>
          <div className="journal-list">
            {recentJournal(state, today).map((j) => (
              <p key={j.date}>
                <span className="muted small">{fmtShort(j.date)}</span>
                <br />
                {j.text}
              </p>
            ))}
          </div>
        </section>
      )}

      {shop && (
        <Sheet title={`Decora tu bonsái · ${state.drops} 💧`} onClose={() => setShop(false)}>
          <p className="muted small">Gana gotas completando cosas, escribiendo en tu diario y con los logros.</p>
          {(['season', 'pot', 'scene', 'extras'] as Slot[]).map((slot) => (
            <div key={slot}>
              <p className="shop-title">{SLOT_TITLES[slot]}</p>
              <div className="shop-grid">
                {SHOP.filter((i) => i.slot === slot).map((i) => {
                  const mine = owns(state, i.id);
                  const on = slot === 'extras' ? eq.extras.includes(i.id) : eq[slot] === i.id;
                  return (
                    <button key={i.id} className={`shop-item ${on ? 'on' : ''} ${!mine && i.price > state.drops ? 'locked' : ''}`} onClick={() => onBuy(i.id)}>
                      <span className="shop-emoji">{i.emoji}</span>
                      <span className="shop-name">{i.name}</span>
                      <span className="shop-desc">{i.description}</span>
                      <span className="shop-price">{on ? (slot === 'extras' ? 'Puesto · quitar' : 'Puesto') : mine ? 'Poner' : `${i.price} 💧`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Sheet>
      )}
    </div>
  );
}
