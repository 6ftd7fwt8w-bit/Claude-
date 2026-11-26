import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyState, type AppState } from './types';
import type { Ctx, Result } from './lib/scheduler';
import { nowMinutes, todayKey } from './lib/time';

const KEY = 'sereno:v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptyState(), ...JSON.parse(raw) };
  } catch {
    /* sin almacenamiento: empezamos de cero */
  }
  return emptyState();
}

export function currentCtx(): Ctx {
  return { today: todayKey(), now: nowMinutes() };
}

export type Action = (state: AppState, ctx: Ctx) => Result | AppState;

export function useStore() {
  const [state, setState] = useState<AppState>(load);
  const ref = useRef(state);

  useEffect(() => {
    ref.current = state;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignorado */
    }
  }, [state]);

  /** Ejecuta una acción pura y devuelve su mensaje (si lo hay). */
  const act = useCallback((fn: Action): string | undefined => {
    const out = fn(ref.current, currentCtx());
    const res: Result = 'state' in out ? out : { state: out };
    ref.current = res.state;
    setState(res.state);
    return res.message;
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignorado */
    }
    ref.current = emptyState();
    setState(ref.current);
  }, []);

  return { state, act, reset };
}
