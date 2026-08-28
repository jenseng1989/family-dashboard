"use client";

import { CloudSun, Compass, Home, MapPin, Settings, Users } from "lucide-react";
import Link from "next/link";
import { ReactNode, useState } from "react";

type TabId = "home" | "weather" | "family" | "gothenburg" | "fun";

type DashboardTabsProps = {
  startContent: ReactNode;
  weatherContent: ReactNode;
  familyContent: ReactNode;
  gothenburgContent: ReactNode;
  funContent: ReactNode;
};

type TabButton = {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: ReactNode;
};

const tabs: TabButton[] = [
  { id: "home", label: "Start", shortLabel: "Start", icon: <Home size={20} /> },
  { id: "weather", label: "Väder & bad", shortLabel: "Väder", icon: <CloudSun size={20} /> },
  { id: "family", label: "Familjen", shortLabel: "Familj", icon: <Users size={20} /> },
  { id: "gothenburg", label: "Göteborg", shortLabel: "GBG", icon: <MapPin size={20} /> },
  { id: "fun", label: "Utforska", shortLabel: "Utforska", icon: <Compass size={20} /> },
];

export default function DashboardTabs({
  startContent, weatherContent, familyContent, gothenburgContent, funContent,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  function getActiveContent(): ReactNode {
    switch (activeTab) {
      case "home": return startContent;
      case "weather": return weatherContent;
      case "family": return familyContent;
      case "gothenburg": return gothenburgContent;
      case "fun": return funContent;
      default: return startContent;
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-6 flex items-stretch gap-2">
        <nav
          aria-label="Dashboardflikar"
          className="min-w-0 flex-1 rounded-3xl border border-white/10 bg-white/[0.08] p-2 shadow-2xl shadow-black/10 backdrop-blur-xl"
        >
          <div className="grid w-full grid-cols-5 gap-2" role="tablist">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isExploreTab = tab.id === "fun";

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-2xl px-2 py-3",
                    "text-xs font-semibold transition duration-300 sm:text-sm",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                    isActive && isExploreTab
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-950/40"
                      : isActive
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-950/30"
                        : "text-slate-300 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <span className={isActive ? "shrink-0 text-white" : "shrink-0 text-slate-400"}>
                    {tab.icon}
                  </span>
                  <span className="hidden min-w-0 truncate md:inline">{tab.label}</span>
                  <span className="min-w-0 truncate md:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <Link
          href="/admin"
          aria-label="Öppna admin"
          title="Admin"
          className="flex w-[72px] shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.08] text-slate-300 shadow-2xl shadow-black/10 backdrop-blur-xl transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:w-20"
        >
          <Settings size={22} />
        </Link>
      </div>

      <div key={activeTab} role="tabpanel" className="w-full min-w-0 animate-[fadeIn_300ms_ease-out]">
        {getActiveContent()}
      </div>
    </div>
  );
}
