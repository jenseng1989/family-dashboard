"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

/** A client clock with no server timestamp and a timer owned by its subscription. */
export function useClientClock(intervalMs = 60_000): Date | null {
  const [clock] = useState(() => {
    let now: number | null = null;
    return {
      getSnapshot: () => now,
      getServerSnapshot: () => null,
      subscribe(listener: () => void) {
        const update = () => {
          now = Date.now();
          listener();
        };
        update();
        const timer = window.setInterval(update, intervalMs);
        return () => window.clearInterval(timer);
      },
    };
  });
  const timestamp = useSyncExternalStore(
    clock.subscribe,
    clock.getSnapshot,
    clock.getServerSnapshot,
  );
  return useMemo(
    () => (timestamp === null ? null : new Date(timestamp)),
    [timestamp],
  );
}

const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    clientSnapshot,
    serverSnapshot,
  );
}
