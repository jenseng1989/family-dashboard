"use client";

import { MapPin } from "lucide-react";
import VasttrafikWidget from "@/components/dashboard/VasttrafikWidget";
import AirQualityWidget from "@/components/dashboard/AirQualityWidget";

export default function GothenburgDashboard() {
  return (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <div className="col-span-12 rounded-3xl border border-blue-300/15 bg-blue-500/[0.07] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-200">
            <MapPin size={25} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              Lokalt
            </p>

            <h2 className="text-xl font-bold text-white">
              Göteborg
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Kollektivtrafik och luftkvalitet på ett ställe.
            </p>
          </div>
        </div>
      </div>

      <div className="col-span-12 min-w-0 xl:col-span-6">
        <VasttrafikWidget />
      </div>

      <div className="col-span-12 min-w-0 xl:col-span-6">
        <AirQualityWidget />
      </div>
    </div>
  );
}