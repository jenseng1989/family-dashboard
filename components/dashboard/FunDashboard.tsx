"use client";

import { LoaderCircle, Satellite } from "lucide-react";
import dynamic from "next/dynamic";
import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import WidgetGate from "@/components/dashboard/WidgetGate";

function SpaceWidgetLoading({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex min-h-48 w-full items-center justify-center rounded-2xl border border-violet-300/10 bg-slate-950/35">
      <div className="flex items-center gap-3 text-slate-400">
        <LoaderCircle
          size={20}
          className="animate-spin text-violet-300"
        />
        <span className="text-sm font-semibold">
          Laddar {label}…
        </span>
      </div>
    </div>
  );
}

const TonightGothenburgWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/TonightGothenburgWidget"
    ),
  {
    loading: () => (
      <SpaceWidgetLoading label="Ikväll i Göteborg" />
    ),
  }
);

const SolarActivityWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/SolarActivityWidget"
    ),
  {
    loading: () => (
      <SpaceWidgetLoading label="Solaktivitet" />
    ),
  }
);

const MeteorShowersWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/MeteorShowersWidget"
    ),
  {
    loading: () => (
      <SpaceWidgetLoading label="Meteorregn" />
    ),
  }
);

const PlanetGuideWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/PlanetGuideWidget"
    ),
  {
    loading: () => (
      <SpaceWidgetLoading label="Planetguide" />
    ),
  }
);

const MoonWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/MoonWidget"
    ),
  {
    loading: () => (
      <SpaceWidgetLoading label="Månfaser" />
    ),
  }
);

const AsteroidWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/AsteroidWidget"
    ),
  {
    loading: () => (
      <SpaceWidgetLoading label="Asteroidvarning" />
    ),
  }
);

const IssWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/IssWidget"
    ),
  {
    loading: () => (
      <SpaceWidgetLoading label="ISS" />
    ),
  }
);

const SatellitesWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/SatellitesWidget"
    ),
  {
    loading: () => (
      <SpaceWidgetLoading label="Satelliter" />
    ),
  }
);

export default function FunDashboard() {
  const spaceWidgets = [
    {
      id: "space-tonight",
      className:
        "col-span-12 min-w-0",
      content: (
        <TonightGothenburgWidget />
      ),
    },
    {
      id: "space-solar-activity",
      className:
        "col-span-12 min-w-0",
      content: (
        <SolarActivityWidget />
      ),
    },
    {
      id: "space-meteor-showers",
      className:
        "col-span-12 min-w-0",
      content: (
        <MeteorShowersWidget />
      ),
    },
    {
      id: "space-iss",
      className:
        "col-span-12 min-w-0 xl:col-span-6",
      content: <IssWidget />,
    },
    {
      id: "space-asteroids",
      className:
        "col-span-12 min-w-0 xl:col-span-6",
      content: <AsteroidWidget />,
    },
    {
      id: "space-moon",
      className:
        "col-span-12 min-w-0 xl:col-span-6",
      content: <MoonWidget />,
    },
    {
      id: "space-planets",
      className:
        "col-span-12 min-w-0 xl:col-span-6",
      content: <PlanetGuideWidget />,
    },
    {
      id: "space-satellites",
      className:
        "col-span-12 min-w-0",
      content: <SatellitesWidget />,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-violet-300/10 bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-950 p-4 shadow-2xl shadow-violet-950/30 sm:p-6">
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute left-[8%] top-[8%] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_8px_white]" />
        <span className="absolute left-[27%] top-[18%] h-1.5 w-1.5 rounded-full bg-violet-200/70 shadow-[0_0_10px_#c4b5fd]" />
        <span className="absolute right-[16%] top-[12%] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_8px_white]" />
        <span className="absolute right-[35%] top-[38%] h-1 w-1 rounded-full bg-blue-200/70 shadow-[0_0_8px_#bfdbfe]" />
        <span className="absolute bottom-[16%] left-[14%] h-1 w-1 rounded-full bg-white/60 shadow-[0_0_8px_white]" />
        <span className="absolute bottom-[9%] right-[12%] h-1.5 w-1.5 rounded-full bg-fuchsia-200/60 shadow-[0_0_10px_#f5d0fe]" />

        <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-28 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="mb-6 rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
                <Satellite size={17} />
                Mission Control
              </p>

              <h2 className="mt-2 text-3xl font-bold text-white">
                Utforska rymden
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                ISS i realtid,
                solaktivitet,
                satellitpassager,
                asteroider, månfaser och
                planetpositioner över
                Göteborg.
              </p>
            </div>

          </div>
        </header>

        <OrderedWidgetGroup
          wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
          itemComponent={WidgetGate}
          widgets={spaceWidgets}
        />

      </div>
    </section>
  );
}