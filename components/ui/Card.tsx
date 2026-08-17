"use client";

import {
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import clsx from "clsx";

type CardProps = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;

  /**
   * Anger standardläget första gången widgeten visas.
   * Om inget anges startar widgeten minimerad.
   */
  defaultMinimized?: boolean;

  /**
   * Äldre namn som fortfarande används av vissa widgets.
   * Behålls för bakåtkompatibilitet.
   */
  defaultCollapsed?: boolean;

  /**
   * Valfri unik nyckel för localStorage.
   * Om inget anges används widgetens titel.
   */
  storageKey?: string;
};

export default function Card({
  title,
  icon,
  children,
  className,
  defaultMinimized,
  defaultCollapsed,
  storageKey,
}: CardProps) {
  const defaultState =
    defaultMinimized ??
    defaultCollapsed ??
    true;

  const localStorageKey = useMemo(() => {
    const key = storageKey ?? title;

    return `family-dashboard:card:${key}`;
  }, [storageKey, title]);

  const [isMinimized, setIsMinimized] =
    useState(defaultState);

  const [hasLoadedPreference, setHasLoadedPreference] =
    useState(false);

  /*
   * Läs sparat läge från den aktuella enheten.
   *
   * Om inget tidigare val finns används standardläget,
   * vilket normalt är minimerat.
   */
  useEffect(() => {
    try {
      const savedValue =
        window.localStorage.getItem(
          localStorageKey
        );

      if (savedValue === "true") {
        setIsMinimized(true);
      } else if (savedValue === "false") {
        setIsMinimized(false);
      } else {
        setIsMinimized(defaultState);
      }
    } catch (error) {
      console.warn(
        `Kunde inte läsa widgetläget för "${title}":`,
        error
      );

      setIsMinimized(defaultState);
    } finally {
      setHasLoadedPreference(true);
    }
  }, [
    defaultState,
    localStorageKey,
    title,
  ]);

  /*
   * Spara användarens val när widgeten
   * öppnas eller minimeras.
   */
  useEffect(() => {
    if (!hasLoadedPreference) {
      return;
    }

    try {
      window.localStorage.setItem(
        localStorageKey,
        String(isMinimized)
      );
    } catch (error) {
      console.warn(
        `Kunde inte spara widgetläget för "${title}":`,
        error
      );
    }
  }, [
    hasLoadedPreference,
    isMinimized,
    localStorageKey,
    title,
  ]);

  function toggleMinimized() {
    setIsMinimized(
      (currentValue) => !currentValue
    );
  }

  return (
    <section
      className={clsx(
        "w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-xl",
        "transition duration-300 hover:bg-white/[0.14]",
        isMinimized ? "p-3" : "p-5",
        className
      )}
    >
      <div
        className={clsx(
          "flex min-w-0 items-center justify-between gap-3",
          !isMinimized && "mb-5"
        )}
      >
        <button
          type="button"
          onClick={toggleMinimized}
          aria-expanded={!isMinimized}
          aria-label={
            isMinimized
              ? `Visa ${title}`
              : `Minimera ${title}`
          }
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          {icon && (
            <div
              className={clsx(
                "flex shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300",
                "transition duration-300",
                isMinimized
                  ? "p-1.5"
                  : "p-2"
              )}
            >
              {icon}
            </div>
          )}

          <h2
            className={clsx(
              "min-w-0 truncate font-semibold text-white",
              "transition duration-300",
              isMinimized
                ? "text-base"
                : "text-lg"
            )}
          >
            {title}
          </h2>
        </button>

        <button
          type="button"
          onClick={toggleMinimized}
          aria-expanded={!isMinimized}
          aria-label={
            isMinimized
              ? `Visa ${title}`
              : `Minimera ${title}`
          }
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <ChevronDown
            size={18}
            className={clsx(
              "transition-transform duration-300",
              !isMinimized && "rotate-180"
            )}
          />
        </button>
      </div>

      <div
        className={clsx(
          "grid transition-all duration-300 ease-in-out",
          isMinimized
            ? "grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100"
        )}
      >
        <div className="min-h-0 min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </section>
  );
}