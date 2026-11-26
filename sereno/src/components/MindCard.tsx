import type { AppState } from '../types';
import { DISCLAIMER, SCIENCE, mindIndex, personalInsights, type MindIndex } from '../lib/mind';
import { minToHm } from '../lib/time';
import { Sheet } from './ui';

function Gauge({ score }: { score: number }) {
  // semicírculo de 0 a 100
  const r = 46;
  const c = Math.PI * r;
  return (
    <svg viewBox="0 0 110 64" width="118" height="70" aria-label={`Índice de mente tranquila: ${score} de 100`}>
      <path d="M9 56 A46 46 0 0 1 101 56" fill="none" stroke="var(--track)" strokeWidth="10" strokeLinecap="round" />
      <path
        d="M9 56 A46 46 0 0 1 101 56"
        fill="none"
        stroke="url(#mind-grad)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <defs>
        <linearGradient id="mind-grad" x1="0" x2="1">
          <stop offset="0" stopColor="#b996d0" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <text x="55" y="52" textAnchor="middle" className="gauge-num">
        {score}
      </text>
    </svg>
  );
}

function Factors({ m }: { m: MindIndex }) {
  return (
    <div className="mind-factors">
      {m.factors.map((f) => (
        <div key={f.key} className="mind-factor">
          <span className="mf-label">{f.label}</span>
          <span className="mf-bar">
            <span style={{ width: `${Math.max(4, f.value * 100)}%` }} className={f.value < 0.5 ? 'low' : ''} />
          </span>
          <span className="mf-note">{f.note}</span>
        </div>
      ))}
    </div>
  );
}

/** "Tu mente hoy": índice de 0 a 100 con sus factores y una recomendación que se puede aplicar. */
export function MindCard({
  state,
  today,
  onRecharge,
  onOpen,
}: {
  state: AppState;
  today: string;
  onRecharge: (sessionId: string) => void;
  onOpen: () => void;
}) {
  const m = mindIndex(state, today);
  const weakest = [...m.factors].sort((a, b) => a.value - b.value)[0];
  return (
    <section className="card mind-card">
      <button className="mind-top" onClick={onOpen} aria-label="Ver análisis de tu mente hoy">
        <Gauge score={m.score} />
        <span className="mind-text">
          <span className="eyebrow">Tu mente hoy</span>
          <span className="h3">{m.title}</span>
          <span className="muted small">{m.message}</span>
        </span>
        <span className="chev">›</span>
      </button>
      {m.focusWithoutRecharge ? (
        <div className="mind-reco">
          <p>
            🫧 Antes de <strong>«{m.focusWithoutRecharge.title}»</strong> ({minToHm(m.focusWithoutRecharge.start)}), unos minutos de
            respiración o un paseo corto te ayudarán a concentrarte y a tener mejores ideas.
          </p>
          <button className="btn primary" onClick={() => onRecharge(m.focusWithoutRecharge!.sessionId)}>
            Añadir 10 min de recarga
          </button>
        </div>
      ) : (
        weakest.value < 0.5 && (
          <p className="mind-reco-text">
            {weakest.key === 'energia'
              ? '🪫 Tu energía está baja: he aligerado el día. Prioriza dormir bien esta noche.'
              : weakest.key === 'carga'
                ? '⚖️ Hoy hay mucha carga: si algo puede esperar, pulsa «Hoy no puedo» y lo recoloco.'
                : weakest.key === 'recarga'
                  ? '🌿 Hoy no tienes recarga: un paseo o 10 minutos para ti marcan la diferencia.'
                  : '🌙 Date más tiempo para desconectar por la noche: tu mente lo agradecerá mañana.'}
          </p>
        )
      )}
    </section>
  );
}

/** Página completa: factores, lo que he aprendido de ti y por qué funciona. */
export function MindSheet({
  state,
  today,
  onClose,
  onRecharge,
}: {
  state: AppState;
  today: string;
  onClose: () => void;
  onRecharge: (sessionId: string) => void;
}) {
  const m = mindIndex(state, today);
  const insights = personalInsights(state, today);
  return (
    <Sheet title="Tu mente hoy" onClose={onClose}>
      <div className="mind-sheet">
        <div className="mind-hero">
          <Gauge score={m.score} />
          <p className="h3">{m.title}</p>
          <p className="muted">{m.message}</p>
        </div>
        <Factors m={m} />
        {m.focusWithoutRecharge && (
          <div className="mind-reco">
            <p>
              🫧 Antes de <strong>«{m.focusWithoutRecharge.title}»</strong> ({minToHm(m.focusWithoutRecharge.start)}), unos minutos de
              respiración o un paseo corto te ayudarán a concentrarte y a tener mejores ideas.
            </p>
            <button
              className="btn primary"
              onClick={() => {
                onRecharge(m.focusWithoutRecharge!.sessionId);
                onClose();
              }}
            >
              Añadir 10 min de recarga
            </button>
          </div>
        )}
        <p className="muted small">
          El índice combina tu energía (25 %), una carga sostenible (25 %), la recarga frente al tiempo de foco (30 %) y tu tiempo
          de desconexión (20 %).
        </p>

        <div className="pd-section">
          <p className="h3">🔍 Lo que he aprendido de ti</p>
          {insights.length ? (
            insights.map((i) => (
              <p key={i.text} className="insight">
                <span>{i.icon}</span> {i.text}
              </p>
            ))
          ) : (
            <p className="muted">
              Aún te estoy conociendo. En unos días, con lo que vayas completando, te enseñaré qué días y horas te funcionan mejor
              y cuánto te ayuda cuidarte.
            </p>
          )}
        </div>

        <div className="pd-section">
          <p className="h3">🧠 Por qué funciona</p>
          <div className="science">
            {SCIENCE.map((s) => (
              <div key={s.title} className="science-item">
                <span className="si-icon">{s.icon}</span>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="disclaimer">{DISCLAIMER}</p>
      </div>
    </Sheet>
  );
}
