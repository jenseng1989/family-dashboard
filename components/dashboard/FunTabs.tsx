"use client";

import { Globe2, Satellite } from "lucide-react";
import { ReactNode, useState } from "react";

type FunTabId = "space" | "earth";

type FunTabsProps = {
  spaceContent: ReactNode;
  otherContent: ReactNode;
  selectedTab?: FunTabId;
  hideNavigation?: boolean;
};

export default function FunTabs({
  spaceContent,
  otherContent,
  selectedTab,
  hideNavigation = false,
}: FunTabsProps) {
  const [activeTab, setActiveTab] = useState<FunTabId>("space");

  const currentTab = selectedTab ?? activeTab;
  const tabs: Array<{ id: FunTabId; label: string }> = [
    { id: "space", label: "Rymden" },
    { id: "earth", label: "Jorden" },
  ];

  const getIcon = (id: FunTabId) =>
    id === "space" ? Satellite : Globe2;

  const getActiveClasses = (id: FunTabId) =>
    id === "space"
      ? "bg-violet-500 text-white shadow-lg shadow-violet-950/20"
      : "bg-emerald-600 text-white shadow-lg shadow-emerald-950/20";

  const content =
    currentTab === "space"
      ? spaceContent
      : otherContent;

  return (
    <div className="w-full min-w-0">
      {!hideNavigation && <div className="mb-5 grid w-full grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-2 backdrop-blur-xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = getIcon(tab.id);

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition",
                isActive
                  ? getActiveClasses(tab.id)
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
              ].join(" ")}
            >
              <Icon size={18} className="shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>}

      <div className="w-full min-w-0">{content}</div>
    </div>
  );
}
