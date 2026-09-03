"use client";

import {
  Globe2,
  LoaderCircle,
  Sparkles,
  Telescope,
} from "lucide-react";
import dynamic from "next/dynamic";

import FunTabs from "@/components/dashboard/FunTabs";
import WidgetGate from "@/components/dashboard/WidgetGate";
import {
  exploreTabWidgetIds,
} from "@/config/widgets";

function ExploreLoading({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-h-[320px] w-full items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.03]">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-violet-300">
          {icon}
        </div>

        <div className="flex items-center gap-2">
          <LoaderCircle
            size={18}
            className="animate-spin"
          />

          <span className="text-sm font-semibold">
            Laddar {label}…
          </span>
        </div>
      </div>
    </div>
  );
}

const SpaceDashboard = dynamic(
  () =>
    import(
      "@/components/dashboard/FunDashboard"
    ),
  {
    loading: () => (
      <ExploreLoading
        icon={
          <Telescope
            size={23}
          />
        }
        label="Rymden"
      />
    ),
  }
);

const EarthDashboard = dynamic(
  () =>
    import(
      "@/components/dashboard/FunOtherDashboard"
    ),
  {
    loading: () => (
      <ExploreLoading
        icon={
          <Globe2
            size={23}
          />
        }
        label="Jorden"
      />
    ),
  }
);

const SkyDashboard = dynamic(
  () =>
    import(
      "@/components/dashboard/SkyDashboard"
    ),
  {
    loading: () => (
      <ExploreLoading
        icon={
          <Sparkles
            size={23}
          />
        }
        label="Himlen"
      />
    ),
  }
);

export default function ExploreDashboardTab() {
  return (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <div className="col-span-12 min-w-0">
        <FunTabs
          spaceContent={
            <WidgetGate
              widgetId={
                exploreTabWidgetIds.space
              }
            >
              <SpaceDashboard />
            </WidgetGate>
          }
          otherContent={
            <WidgetGate
              widgetId={
                exploreTabWidgetIds.earth
              }
            >
              <EarthDashboard />
            </WidgetGate>
          }
          skyContent={
            <WidgetGate
              widgetId={
                exploreTabWidgetIds.sky
              }
            >
              <SkyDashboard />
            </WidgetGate>
          }
        />
      </div>
    </div>
  );
}
