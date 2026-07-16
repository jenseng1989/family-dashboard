"use client";

import { ReactNode, useState } from "react";
import {
  PartyPopper,
  Rocket,
  Sparkles,
} from "lucide-react";

type FunTabId = "space" | "other";

type FunTabsProps = {
  spaceContent: ReactNode;
  otherContent: ReactNode;
};

type FunTab = {
  id: FunTabId;
  label: string;
  description: string;
  icon: ReactNode;
};

const tabs: FunTab[] = [
  {
    id: "space",
    label: "Rymden",
    description: "ISS, asteroider, månen och planeter",
    icon: <Rocket size={20} />,
  },
  {
    id: "other",
    label: "Övrigt",
    description: "Djur, fakta och annat kul",
    icon: <PartyPopper size={20} />,
  },
];

export default function FunTabs({
  spaceContent,
  otherContent,
}: FunTabsProps) {
  const [activeTab, setActiveTab] =
    useState<FunTabId>("space");

  const activeContent =
    activeTab === "space"
      ? spaceContent
      : otherContent;

  return (
    <section className="relative">
      <nav
        aria-label="Underflikar för Roligt"
        className="mb-5 overflow-hidden rounded-3xl border border-violet-300/10 bg-slate-950/60 p-2 shadow-2xl shadow-violet-950/20 backdrop-blur-xl"
      >
        <div
          role="tablist"
          className="grid grid-cols-2 gap-2"
        >
          {tabs.map((tab) => {
            const isActive =
              activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`fun-panel-${tab.id}`}
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={[
                  "group relative flex min-h-16 items-center justify-center gap-3 overflow-hidden rounded-2xl px-3 py-3",
                  "text-left transition duration-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
                  isActive
                    ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-950/40"
                    : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] hover:text-white",
                ].join(" ")}
              >
                {isActive && (
                  <>
                    <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

                    <span className="pointer-events-none absolute bottom-2 left-[15%] h-1 w-1 rounded-full bg-white/70" />

                    <span className="pointer-events-none absolute right-[18%] top-3 h-1 w-1 rounded-full bg-white/60" />
                  </>
                )}

                <span
                  className={[
                    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition",
                    isActive
                      ? "border-white/15 bg-white/15 text-white"
                      : "border-violet-300/10 bg-violet-400/10 text-violet-300 group-hover:bg-violet-400/20",
                  ].join(" ")}
                >
                  {tab.icon}
                </span>

                <span className="relative min-w-0">
                  <span className="block text-sm font-bold sm:text-base">
                    {tab.label}
                  </span>

                  <span
                    className={[
                      "mt-0.5 hidden text-xs sm:block",
                      isActive
                        ? "text-violet-100"
                        : "text-slate-500",
                    ].join(" ")}
                  >
                    {tab.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div
        id={`fun-panel-${activeTab}`}
        key={activeTab}
        role="tabpanel"
        className="animate-[fadeIn_300ms_ease-out]"
      >
        {activeContent}
      </div>
    </section>
  );
}

type FunOtherPlaceholderProps = {
  title?: string;
};

export function FunOtherPlaceholder({
  title = "Övrigt",
}: FunOtherPlaceholderProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-fuchsia-300/10 bg-gradient-to-br from-slate-950 via-fuchsia-950/30 to-slate-950 p-6 shadow-2xl shadow-fuchsia-950/20 sm:p-8">
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute left-[10%] top-[14%] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_8px_white]" />

        <span className="absolute right-[15%] top-[20%] h-1.5 w-1.5 rounded-full bg-fuchsia-200/70 shadow-[0_0_10px_#f5d0fe]" />

        <span className="absolute bottom-[15%] left-[25%] h-1 w-1 rounded-full bg-violet-200/60 shadow-[0_0_8px_#ddd6fe]" />

        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-72 flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-fuchsia-300/15 bg-fuchsia-400/10 text-fuchsia-300 shadow-lg shadow-fuchsia-950/20">
          <PartyPopper size={30} />
        </div>

        <p className="mt-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
          <Sparkles size={16} />
          {title}
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Mer roligt är på väg
        </h2>

        <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
          I nästa steg flyttar vi Dagens djur hit.
          Därefter kan vi lägga till exempelvis dagens
          fakta, gåta, skämt eller historiska händelse.
        </p>
      </div>
    </section>
  );
}