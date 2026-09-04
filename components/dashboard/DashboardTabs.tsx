"use client";

import {
  CloudSun,
  Compass,
  Home,
  LoaderCircle,
  MapPin,
  Settings,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import {
  DEFAULT_APP_SETTINGS,
  getAppSettings,
  type AppSettings,
  type AppTabId,
} from "@/lib/app-settings-client";

type TabId = AppTabId;

type DashboardTabsProps = {
  startContent: ReactNode;
  weatherContent: ReactNode;
};

type TabButton = {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: ReactNode;
};

function TabLoading({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex min-h-[220px] w-full items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-3 text-slate-400">
        <LoaderCircle
          size={21}
          className="animate-spin text-blue-300"
        />

        <span className="text-sm font-semibold">
          Laddar {label}…
        </span>
      </div>
    </div>
  );
}

/*
 * Dessa tre flikar innehåller klientkompatibla
 * moduler och kan därför lazy-loadas säkert.
 *
 * Väder skickas däremot in som server-renderat
 * innehåll från Dashboard.tsx eftersom WeatherWidget
 * är en async Server Component.
 */
const FamilyDashboardTab = dynamic(
  () =>
    import(
      "@/components/dashboard/tabs/FamilyDashboardTab"
    ),
  {
    loading: () => (
      <TabLoading label="familjen" />
    ),
  }
);

const GothenburgDashboardTab = dynamic(
  () =>
    import(
      "@/components/dashboard/tabs/GothenburgDashboardTab"
    ),
  {
    loading: () => (
      <TabLoading label="Göteborg" />
    ),
  }
);

const ExploreDashboardTab = dynamic(
  () =>
    import(
      "@/components/dashboard/tabs/ExploreDashboardTab"
    ),
  {
    loading: () => (
      <TabLoading label="Utforska" />
    ),
  }
);

const tabs: TabButton[] = [
  {
    id: "home",
    label: "Start",
    shortLabel: "Start",
    icon: <Home size={20} />,
  },
  {
    id: "weather",
    label: "Väder",
    shortLabel: "Väder",
    icon: <CloudSun size={20} />,
  },
  {
    id: "family",
    label: "Familjen",
    shortLabel: "Familj",
    icon: <Users size={20} />,
  },
  {
    id: "gothenburg",
    label: "Göteborg",
    shortLabel: "GBG",
    icon: <MapPin size={20} />,
  },
  {
    id: "fun",
    label: "Utforska",
    shortLabel: "Utforska",
    icon: <Compass size={20} />,
  },
];

export default function DashboardTabs({
  startContent,
  weatherContent,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] =
    useState<TabId>("home");

  const [appSettings, setAppSettings] =
    useState<AppSettings>(
      DEFAULT_APP_SETTINGS
    );

  const [settingsLoaded, setSettingsLoaded] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAppSettings() {
      try {
        const loadedSettings =
          await getAppSettings();

        if (cancelled) {
          return;
        }

        setAppSettings(
          loadedSettings
        );
        setActiveTab(
          loadedSettings.defaultTab
        );

        document.title =
          loadedSettings.dashboardName;
      } catch (error) {
        console.error(
          "Kunde inte läsa appinställningar i dashboarden:",
          error
        );

        if (!cancelled) {
          setAppSettings(
            DEFAULT_APP_SETTINGS
          );
          setActiveTab(
            DEFAULT_APP_SETTINGS.defaultTab
          );

          document.title =
            DEFAULT_APP_SETTINGS.dashboardName;
        }
      } finally {
        if (!cancelled) {
          setSettingsLoaded(
            true
          );
        }
      }
    }

    void loadAppSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  function getActiveContent():
    ReactNode {
    switch (activeTab) {
      case "home":
        return startContent;

      case "weather":
        return weatherContent;

      case "family":
        return (
          <FamilyDashboardTab />
        );

      case "gothenburg":
        return (
          <GothenburgDashboardTab />
        );

      case "fun":
        return (
          <ExploreDashboardTab />
        );

      default:
        return startContent;
    }
  }

  if (!settingsLoaded) {
    return (
      <div className="flex min-h-[220px] w-full items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <LoaderCircle
            size={21}
            className="animate-spin"
          />

          <span className="text-sm font-semibold">
            Startar dashboarden…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-6 flex items-stretch gap-2">
        <nav
          aria-label="Dashboardflikar"
          className="min-w-0 flex-1 rounded-3xl border border-white/10 bg-white/[0.08] p-2 shadow-2xl shadow-black/10 backdrop-blur-xl"
        >
          <div
            className="grid w-full grid-cols-5 gap-2"
            role="tablist"
          >
            {tabs.map(
              (tab) => {
                const isActive =
                  activeTab ===
                  tab.id;

                const isExploreTab =
                  tab.id ===
                  "fun";

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={
                      isActive
                    }
                    onClick={() =>
                      setActiveTab(
                        tab.id
                      )
                    }
                    className={[
                      "flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-2xl px-2 py-3",
                      "text-xs font-semibold transition duration-300 sm:text-sm",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                      isActive &&
                      isExploreTab
                        ? "bg-violet-500 text-white shadow-lg shadow-violet-950/40"
                        : isActive
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-950/30"
                          : "text-slate-300 hover:bg-white/10 hover:text-white",
                    ].join(
                      " "
                    )}
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

                    <span className="hidden min-w-0 truncate md:inline">
                      {tab.label}
                    </span>

                    <span className="min-w-0 truncate md:hidden">
                      {tab.shortLabel}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </nav>

        {appSettings.showAdminButton && (
          <Link
            href="/admin"
            aria-label="Öppna admin"
            title="Admin"
            className="flex w-[72px] shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.08] text-slate-300 shadow-2xl shadow-black/10 backdrop-blur-xl transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:w-20"
          >
            <Settings size={22} />
          </Link>
        )}
      </div>

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
