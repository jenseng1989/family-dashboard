"use client";

import {
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ReactNode,
  useState,
} from "react";
import clsx from "clsx";

type CardProps = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultMinimized?: boolean;
};

export default function Card({
  title,
  icon,
  children,
  className,
  defaultMinimized = false,
}: CardProps) {
  const [isMinimized, setIsMinimized] =
    useState(defaultMinimized);

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
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <div
              className={clsx(
                "flex shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300",
                isMinimized ? "p-1.5" : "p-2"
              )}
            >
              {icon}
            </div>
          )}

          <h2
            className={clsx(
              "min-w-0 truncate font-semibold text-white",
              isMinimized
                ? "text-base"
                : "text-lg"
            )}
          >
            {title}
          </h2>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsMinimized(
              (currentValue) => !currentValue
            )
          }
          aria-expanded={!isMinimized}
          aria-label={
            isMinimized
              ? `Visa ${title}`
              : `Minimera ${title}`
          }
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          {isMinimized ? (
            <ChevronDown size={18} />
          ) : (
            <ChevronUp size={18} />
          )}
        </button>
      </div>

      {!isMinimized && (
        <div className="min-w-0">
          {children}
        </div>
      )}
    </section>
  );
}