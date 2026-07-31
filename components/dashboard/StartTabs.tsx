"use client";

import { ReactNode, useState } from "react";
import { Home, ShoppingCart } from "lucide-react";

type StartTabId = "home" | "shopping";

type StartTabsProps = {
  homeContent: ReactNode;
  shoppingContent: ReactNode;
};

type StartTabButton = {
  id: StartTabId;
  label: string;
  icon: ReactNode;
};

const tabs: StartTabButton[] = [
  {
    id: "home",
    label: "Hem",
    icon: <Home size={18} />,
  },
  {
    id: "shopping",
    label: "Inköp",
    icon: <ShoppingCart size={18} />,
  },
];

export default function StartTabs({
  homeContent,
  shoppingContent,
}: StartTabsProps) {
  const [activeTab, setActiveTab] =
    useState<StartTabId>("home");

  function getActiveContent(): ReactNode {
    switch (activeTab) {
      case "shopping":
        return shoppingContent;

      case "home":
      default:
        return homeContent;
    }
  }

  return (
    <div className="w-full min-w-0">
      <nav
        aria-label="Startflikar"
        className="mb-5 w-full rounded-3xl border border-white/10 bg-white/[0.06] p-2 shadow-xl shadow-black/10 backdrop-blur-xl"
      >
        <div
          className="grid w-full grid-cols-2 gap-2"
          role="tablist"
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
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={[
                  "flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-2xl px-3 py-2.5",
                  "text-sm font-semibold transition duration-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                  isActive
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-950/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <span
                  className={
                    isActive
                      ? "shrink-0 text-white"
                      : "shrink-0 text-slate-400"
                  }
                >
                  {tab.icon}
                </span>

                <span className="min-w-0 truncate">
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
        className="w-full min-w-0 animate-[fadeIn_300ms_ease-out]"
      >
        {getActiveContent()}
      </div>
    </div>
  );
}