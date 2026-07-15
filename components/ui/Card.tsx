"use client";

import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

type CardProps = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

export default function Card({
  title,
  icon,
  children,
  className,
  collapsible = true,
  defaultCollapsed = false,
}: CardProps) {
  const [isCollapsed, setIsCollapsed] = useState(
    collapsible && defaultCollapsed
  );

  function toggleCollapsed() {
    if (!collapsible) {
      return;
    }

    setIsCollapsed((currentValue) => !currentValue);
  }

  return (
    <section
      className={clsx(
        "overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-xl",
        "transition-[background-color,transform] duration-300",
        !isCollapsed &&
          "hover:-translate-y-1 hover:bg-white/[0.14]",
        className
      )}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        disabled={!collapsible}
        aria-expanded={!isCollapsed}
        className={clsx(
          "flex w-full items-center gap-3 text-left",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300",
          isCollapsed ? "px-4 py-2.5" : "px-5 pb-4 pt-5",
          collapsible
            ? "cursor-pointer hover:bg-white/5"
            : "cursor-default"
        )}
      >
        {icon && (
          <div
            className={clsx(
              "flex shrink-0 items-center justify-center bg-blue-500/20 text-blue-300 transition-all duration-300",
              isCollapsed
                ? "h-8 w-8 rounded-xl [&_svg]:h-4 [&_svg]:w-4"
                : "rounded-2xl p-2"
            )}
          >
            {icon}
          </div>
        )}

        <h2
          className={clsx(
            "min-w-0 flex-1 truncate font-semibold text-white transition-all duration-300",
            isCollapsed ? "text-sm" : "text-lg"
          )}
        >
          {title}
        </h2>

        {collapsible && (
          <ChevronDown
            size={19}
            aria-hidden="true"
            className={clsx(
              "shrink-0 text-slate-400 transition-transform duration-300",
              !isCollapsed && "rotate-180"
            )}
          />
        )}
      </button>

      {!isCollapsed && (
        <div className="animate-[fadeIn_250ms_ease-out] px-5 pb-5">
          {children}
        </div>
      )}
    </section>
  );
}