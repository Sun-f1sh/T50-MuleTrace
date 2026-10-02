"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface State<T> {
  data: T | null;
  error: string | null;
  pending: boolean;
}

/** Small fetch-state hook: loading / success / error with manual reload. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [state, setState] = useState<State<T>>({ data: null, error: null, pending: true });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    let cancelled = false;
    // Resolve in a microtask so state updates never happen synchronously
    // inside the effect body, and the loading flag flips immediately.
    Promise.resolve()
      .then(() => {
        if (!cancelled) setState((s) => ({ ...s, pending: true }));
        return fnRef.current();
      })
      .then((result) => {
        if (!cancelled) setState({ data: result, error: null, pending: false });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : "Something went wrong",
            pending: false,
          }));
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { data: state.data, loading: state.pending, error: state.error, reload };
}
