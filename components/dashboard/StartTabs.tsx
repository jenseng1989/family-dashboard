"use client";

import {
  Home,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import {
  ReactNode,
  useState,
} from "react";

type StartTabId =
  | "everyday"
  | "home"
  | "shopping";

type StartTabsProps = {
  everydayContent: ReactNode;
  homeContent: ReactNode;
  shoppingContent: ReactNode;
};

const tabs: Array<{
  id: StartTabId;
  label: string;
  icon: typeof Sparkles;
}> = [
  {
    id: "everyday",
    label: "Vardagen",
    icon: Sparkles,
  },
  {
    id: "home",
    label: "Hemmet",
    icon: Home,
  },
  {
    id: "shopping",
    label: "Inköp",
    icon: ShoppingCart,
  },
];

export default function StartTabs({
  everydayContent,
  homeContent,
  shoppingContent,
}: StartTabsProps) {
  const [
    activeTab,
    setActiveTab,
  ] = useState<StartTabId>(
    "everyday"
  );

  function getActiveContent(): ReactNode {
    switch (activeTab) {
      case "everyday":
        return everydayContent;

      case "home":
        return homeContent;

      case "shopping":
        return shoppingContent;

      default:
        return everydayContent;
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-5 grid w-full grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-2 backdrop-blur-xl">
        {tabs.map(
          (tab) => {
            const isActive =
              activeTab ===
              tab.id;

            const Icon =
              tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(
                    tab.id
                  )
                }
                className={[
                  "flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-semibold transition sm:px-3 sm:text-sm",
                  isActive
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-950/25"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                ].join(" ")}
              >
                <Icon
                  size={17}
                  className="shrink-0"
                />

                <span className="truncate">
                  {tab.label}
                </span>
              </button>
            );
          }
        )}
      </div>

      <div
        key={activeTab}
        className="w-full min-w-0 animate-[fadeIn_250ms_ease-out]"
      >
        {getActiveContent()}
      </div>
    </div>
  );
}