"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";

import {
  Baby,
  UserRound,
  Users,
} from "lucide-react";

import type { MemberType } from "@/lib/family";

type PersonTab = {
  id: string;
  label: string;
  emoji: string;
  memberType: MemberType;
  content: ReactNode;
};

type FamilyTabsProps = {
  sharedContent: ReactNode;
  personTabs: PersonTab[];
};

export default function FamilyTabs({
  sharedContent,
  personTabs,
}: FamilyTabsProps) {
  const [activeTab, setActiveTab] =
    useState<string>("shared");

  useEffect(() => {
    if (activeTab === "shared") {
      return;
    }

    const tabStillExists =
      personTabs.some(
        (tab) => tab.id === activeTab
      );

    if (!tabStillExists) {
      setActiveTab("shared");
    }
  }, [activeTab, personTabs]);

  const activePersonTab =
    personTabs.find(
      (tab) => tab.id === activeTab
    );

  const activeContent =
    activeTab === "shared"
      ? sharedContent
      : activePersonTab?.content ??
        sharedContent;

  const columnCount =
    personTabs.length + 1;

  return (
    <div className="w-full min-w-0">
      <nav
        aria-label="Familjeflikar"
        className="mb-5 rounded-2xl border border-white/10 bg-white/[0.06] p-2 shadow-xl shadow-black/10 backdrop-blur-xl"
      >
        <div
          className="flex gap-2 overflow-x-auto"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={
              activeTab === "shared"
            }
            onClick={() =>
              setActiveTab("shared")
            }
            className={[
              "flex min-h-12 min-w-[110px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2",
              "text-xs font-semibold transition duration-300 sm:text-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
              activeTab === "shared"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-950/30"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            <Users size={18} />

            <span className="hidden sm:inline">
              Gemensam
            </span>

            <span className="sm:hidden">
              Gem.
            </span>
          </button>

          {personTabs.map((tab) => {
            const isActive =
              activeTab === tab.id;

            const TypeIcon =
              tab.memberType === "child"
                ? Baby
                : UserRound;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={[
                  "flex min-h-12 min-w-[110px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2",
                  "text-xs font-semibold transition duration-300 sm:text-sm",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                  isActive
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-950/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <TypeIcon
                  size={16}
                  className={
                    isActive
                      ? "shrink-0 text-white/80"
                      : "shrink-0 text-slate-500"
                  }
                />

                <span className="truncate">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div
        key={activeTab}
        role="tabpanel"
        className="animate-[fadeIn_300ms_ease-out]"
      >
        {activeContent}
      </div>

      {columnCount === 0 && null}
    </div>
  );
}