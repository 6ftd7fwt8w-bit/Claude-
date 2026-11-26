import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_PROFILE, emptyState, type AppState } from './types';
import type { Ctx, Result } from './lib/scheduler';
import { nowMinutes, todayKey } from './lib/time';
import { persist, restore } from './native';

const KEY = 'sereno:v1';

/** Completa datos guardados con versiones anteriores de la app. */
export function hydrate(raw: unknown): AppState {
  const base = emptyState();
  const s = { ...base, ...(raw as Partial<AppState>) };
  if (s.profile) s.profile = { ...DEFAULT_PROFILE, ...s.profile };
  s.equipped = { ...base.equipped, ...s.equipped };
  return s;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return hydrate(JSON.parse(raw));
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

  // en iPhone, si iOS borró localStorage, recuperamos la copia de Preferences
  useEffect(() => {
    if (ref.current.profile) return;
    restore().then((raw) => {
      if (raw && !ref.current.profile) {
        ref.current = hydrate(JSON.parse(raw));
        setState(ref.current);
      }
    });
  }, []);

  useEffect(() => {
    ref.current = state;
    const json = JSON.stringify(state);
    try {
      localStorage.setItem(KEY, json);
    } catch {
      /* ignorado */
    }
    persist(json).catch(() => undefined);
  }, [state]);

  /** Ejecuta una acción pura y devuelve su mensaje (si lo hay). */
  const act = useCallback((fn: Action): string | undefined => {
    const out = fn(ref.current, currentCtx());
    const res: Result = 'state' in out ? out : { state: out };
    ref.current = res.state;
    setState(res.state);
    return res.message;
  }, []);

  const replace = useCallback((next: AppState) => {
    ref.current = next;
    setState(next);
  }, []);

  const reset = useCallback(() => replace(emptyState()), [replace]);

  return { state, act, reset, replace };
}
