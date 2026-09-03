"use client";

import {
  LoaderCircle,
  Wind,
} from "lucide-react";
import dynamic from "next/dynamic";

import LazyViewport from "@/components/dashboard/LazyViewport";

function AirQualityLoading() {
  return (
    <div className="flex min-h-52 w-full items-center justify-center rounded-2xl border border-emerald-300/10 bg-white/[0.03]">
      <div className="flex items-center gap-3 text-slate-400">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-emerald-300">
          <Wind
            size={20}
          />
        </div>

        <div className="flex items-center gap-2">
          <LoaderCircle
            size={18}
            className="animate-spin text-emerald-300"
          />

          <span className="text-sm font-semibold">
            Laddar luftkvalitet…
          </span>
        </div>
      </div>
    </div>
  );
}

const AirQualityWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/AirQualityWidget"
    ),
  {
    loading: () => (
      <AirQualityLoading />
    ),
  }
);

export default function WeatherAirQualityLazy() {
  return (
    <LazyViewport
      fallback={
        <AirQualityLoading />
      }
      rootMargin="500px 0px"
    >
      <AirQualityWidget />
    </LazyViewport>
  );
}
