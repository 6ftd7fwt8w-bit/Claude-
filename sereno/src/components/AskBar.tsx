import { useEffect, useState } from 'react';
import { Icon } from './Icons';

export const ADD_EXAMPLES = [
  'Mañana almuerzo con mis padres de 10 a 2',
  'Llamar a mamá el viernes a las 20:00',
  'Gimnasio 3 veces por semana',
  'Escribir mi libro 20 h antes de marzo',
  'Renovar el DNI esta semana',
  'Quedar con amigas 2 veces al mes',
];

/** Escribe los ejemplos letra a letra, como si alguien los estuviera tecleando */
function useTypewriter(list: string[], active: boolean): string {
  const [k, setK] = useState(0);
  const [n, setN] = useState(0);
  const [pause, setPause] = useState(0);
  useEffect(() => {
    if (!active) return;
    const full = list[k % list.length];
    const t = setTimeout(
      () => {
        if (pause > 0) return setPause((p) => p - 1);
        if (n < full.length) return setN(n + 1);
        setPause(1);
        setK((x) => x + 1);
        setN(0);
      },
      pause > 0 ? 1800 : n === 0 ? 400 : 45,
    );
    return () => clearTimeout(t);
  }, [k, n, pause, active, list]);
  return list[k % list.length].slice(0, n);
}

/** Barra principal para añadir: escribe como hablas y Sereno lo coloca */
export function AskBar({ onSubmit, onOpen }: { onSubmit: (text: string) => void; onOpen: () => void }) {
  const [text, setText] = useState('');
  const [focus, setFocus] = useState(false);
  const typed = useTypewriter(ADD_EXAMPLES, !focus && !text);
  const send = () => {
    if (!text.trim()) return onOpen();
    onSubmit(text.trim());
    setText('');
  };
  return (
    <div className={`ask-bar ${focus ? 'focus' : ''}`}>
      <span className="ask-bar-icon" aria-hidden="true">
        <Icon name="wand" size={22} />
      </span>
      <div className="ask-bar-field">
        <span className="ask-bar-label">¿Qué tienes en mente?</span>
        <input
          value={text}
          aria-label="Escribe algo para añadir: una cita, una tarea, un proyecto…"
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        {!text && (
          <span className="ask-bar-ghost" aria-hidden="true">
            {focus ? 'Escribe como se lo dirías a un amigo…' : `«${typed}`}
            {!focus && <i className="caret" />}
          </span>
        )}
      </div>
      <button className="ask-bar-go" aria-label={text.trim() ? 'Organizar' : 'Abrir el asistente'} onClick={send}>
        <Icon name={text.trim() ? 'check' : 'plus'} size={22} />
      </button>
    </div>
  );
}

/** Explicación de la primera vez: cómo se usa Sereno en tres pasos */
export function AddHint({ onTry, onClose }: { onTry: (text: string) => void; onClose: () => void }) {
  return (
    <section className="add-hint">
      <button className="add-hint-x" aria-label="Cerrar" onClick={onClose}>
        ✕
      </button>
      <p className="h3">Así funciona Sereno</p>
      <ol className="add-steps">
        <li>
          <span className="step-num">1</span>
          <span>
            <strong>Escribe lo que sea</strong> como se lo dirías a un amigo: una cita, una tarea, un proyecto o un hábito.
          </span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>
            <strong>Te pregunto lo justo</strong>: si se repite, para cuándo, cuánto tiempo…
          </span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>
            <strong>Lo coloco en tu calendario</strong>: a su hora si es una cita, o en un hueco libre que encaje con tu energía.
          </span>
        </li>
      </ol>
      <p className="muted small">Prueba con un ejemplo:</p>
      <div className="chips">
        {ADD_EXAMPLES.slice(0, 3).map((e) => (
          <button key={e} className="chip" onClick={() => onTry(e)}>
            {e}
          </button>
        ))}
      </div>
    </section>
  );
}
