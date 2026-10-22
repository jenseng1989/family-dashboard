"use client";

import { useMemo, useSyncExternalStore, type SetStateAction } from "react";

type Decoder<T> = (raw: string, fallback: T) => T;
const decodeJson = <T,>(raw: string): T => JSON.parse(raw) as T;

function createBrowserStore<T>(key: string, fallback: T, decode: Decoder<T>) {
  const serverSnapshot = { value: fallback, loaded: false };
  let snapshot = serverSnapshot;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!snapshot.loaded) {
        let value = fallback;
        try {
          const raw = window.localStorage.getItem(key);
          if (raw !== null) value = decode(raw, fallback);
        } catch {
          // Invalid or inaccessible storage keeps the server default.
        }
        snapshot = { value, loaded: true };
        notify();
      }
      return () => {
        listeners.delete(listener);
      };
    },
    setValue(action: SetStateAction<T>) {
      const value =
        typeof action === "function"
          ? (action as (previous: T) => T)(snapshot.value)
          : action;
      if (Object.is(value, snapshot.value)) return;
      snapshot = { ...snapshot, value };
      notify();
    },
  };
}

/** Restore browser state after hydration. Callers retain their existing save policy. */
export function useStoredState<T>(
  key: string,
  initial: T,
  decode: Decoder<T> = decodeJson,
) {
  const initialJson = JSON.stringify(initial);
  const store = useMemo(
    () => createBrowserStore(key, JSON.parse(initialJson) as T, decode),
    [key, initialJson, decode],
  );
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return [snapshot.value, store.setValue, snapshot.loaded] as const;
}

export function decodeBoolean(raw: string, fallback: boolean): boolean {
  return raw === "true" ? true : raw === "false" ? false : fallback;
}
