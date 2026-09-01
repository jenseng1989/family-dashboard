"use client";

import { MapPin } from "lucide-react";

import AirQualityWidget from "@/components/dashboard/AirQualityWidget";
import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import VasttrafikWidget from "@/components/dashboard/VasttrafikWidget";
import WidgetGate from "@/components/dashboard/WidgetGate";

export default function GothenburgDashboard() {
  const gothenburgWidgets = [
    {
      id: "gothenburg-vasttrafik",
      className:
        "col-span-12 min-w-0 xl:col-span-6",
      content: <VasttrafikWidget />,
    },
    {
      id: "gothenburg-air-quality",
      className:
        "col-span-12 min-w-0 xl:col-span-6",
      content: <AirQualityWidget />,
    },
  ];

  return (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      {/* Fast Göteborg-header – administreras inte som widget */}
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
              Kollektivtrafik och luftkvalitet på ett
              ställe.
            </p>
          </div>
        </div>
      </div>

      <OrderedWidgetGroup
        wrapperClassName="contents"
        itemComponent={WidgetGate}
        widgets={gothenburgWidgets}
      />
    </div>
  );
}