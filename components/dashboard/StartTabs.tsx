
"use client";

import {
  Home,
  GraduationCap,
  HousePlug,
  LoaderCircle,
  ShoppingCart,
  Sparkles,
} from "lucide-react";

import dynamic from "next/dynamic";

import {
  type ReactNode,
  useState,
} from "react";

/*
 * Smarthem är tillfälligt dolt.
 *
 * All kod och integration finns kvar.
 * Ändra till true när Smarthem ska aktiveras igen.
 */
const ENABLE_SMART_HOME = false;

type StartTabId =
  | "everyday"
  | "home"
  | "shopping"
  | "school"
  | "smart-home";

type StartTabsProps = {
  everydayContent: ReactNode;
};

type StartTab = {
  id: StartTabId;
  label: string;
  icon: typeof Sparkles;
};

const tabs: StartTab[] = [
  {
    id: "everyday",
    label: "Idag",
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
  {
    id: "school",
    label: "Skola",
    icon: GraduationCap,
  },

  ...(ENABLE_SMART_HOME
    ? [
        {
          id: "smart-home" as const,
          label: "Smarthem",
          icon: HousePlug,
        },
      ]
    : []),
];

function StartTabLoading({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex min-h-52 w-full items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-3 text-slate-400">
        <LoaderCircle
          size={20}
          className="animate-spin text-blue-300"
        />

        <span className="text-sm font-semibold">
          Laddar {label}…
        </span>
      </div>
    </div>
  );
}

const StartHomeTab = dynamic(
  () =>
    import(
      "@/components/dashboard/tabs/StartHomeTab"
    ),
  {
    loading: () => (
      <StartTabLoading label="Hemmet" />
    ),
  }
);

const StartShoppingTab = dynamic(
  () =>
    import(
      "@/components/dashboard/tabs/StartShoppingTab"
    ),
  {
    loading: () => (
      <StartTabLoading label="Inköp" />
    ),
  }
);

const StartSchoolTab = dynamic(
  () =>
    import(
      "@/components/dashboard/tabs/StartSchoolTab"
    ),
  {
    loading: () => (
      <StartTabLoading label="Skola" />
    ),
  }
);

/*
 * Smarthem-komponenten behålls.
 * Den laddas inte så länge fliken är dold.
 */
const StartSmartHomeTab = dynamic(
  () =>
    import(
      "@/components/dashboard/tabs/StartSmartHomeTab"
    ),
  {
    loading: () => (
      <StartTabLoading label="Smarthem" />
    ),
  }
);

export default function StartTabs({
  everydayContent,
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
        return <StartHomeTab />;

      case "shopping":
        return <StartShoppingTab />;

      case "school":
        return <StartSchoolTab />;

      case "smart-home":
        return ENABLE_SMART_HOME
          ? <StartSmartHomeTab />
          : everydayContent;

      default:
        return everydayContent;
    }
  }

  return (
    <div className="w-full min-w-0">
      <div
        className="mb-5 grid w-full gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-2 backdrop-blur-xl"
        style={{
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
        }}
        role="tablist"
        aria-label="Startflikar"
      >
        {tabs.map((tab) => {
          const isActive =
            activeTab === tab.id;

          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`start-tabpanel-${tab.id}`}
              id={`start-tab-${tab.id}`}
              onClick={() =>
                setActiveTab(tab.id)
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
        })}
      </div>

      <div
        key={activeTab}
        id={`start-tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`start-tab-${activeTab}`}
        className="w-full min-w-0 animate-[fadeIn_250ms_ease-out]"
      >
        {getActiveContent()}
      </div>
    </div>
  );
}