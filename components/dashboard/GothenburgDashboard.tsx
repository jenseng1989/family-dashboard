"use client";

import {
  LoaderCircle,
  MapPin,
} from "lucide-react";
import dynamic from "next/dynamic";

import GothenburgTodayWidget from "@/components/dashboard/GothenburgTodayWidget";
import LazyViewport from "@/components/dashboard/LazyViewport";
import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import WidgetGate from "@/components/dashboard/WidgetGate";
import {
  getWidgetGroup,
} from "@/config/widgets";
import {
  buildDashboardWidgets,
} from "@/lib/dashboard-widgets";

function GothenburgWidgetLoading({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex min-h-48 w-full items-center justify-center rounded-2xl border border-blue-300/10 bg-white/[0.03]">
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

const GothenburgEventsWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/GothenburgEventsWidget"
    ),
  {
    loading: () => (
      <GothenburgWidgetLoading label="evenemang" />
    ),
  }
);

const VasttrafikWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/VasttrafikWidget"
    ),
  {
    loading: () => (
      <GothenburgWidgetLoading label="Västtrafik" />
    ),
  }
);

const BathingWidget = dynamic(
  () =>
    import(
      "@/components/dashboard/BathingWidget"
    ),
  {
    loading: () => (
      <GothenburgWidgetLoading label="badtemperaturer" />
    ),
  }
);

const gothenburgConfig =
  getWidgetGroup("gothenburg");

const gothenburgContentMap = {
  /*
   * Dagens Göteborg ligger kvar direkt.
   * Det är den första och viktigaste lokala översikten.
   */
  "gothenburg-today": (
    <GothenburgTodayWidget />
  ),

  /*
   * De tyngre delarna får egna chunks.
   * LazyViewport gör dessutom att de inte behöver
   * renderas förrän de närmar sig skärmen.
   */
  "gothenburg-events": (
    <LazyViewport
      fallback={
        <GothenburgWidgetLoading label="evenemang" />
      }
      rootMargin="600px 0px"
    >
      <GothenburgEventsWidget />
    </LazyViewport>
  ),

  "gothenburg-vasttrafik": (
    <LazyViewport
      fallback={
        <GothenburgWidgetLoading label="Västtrafik" />
      }
      rootMargin="500px 0px"
    >
      <VasttrafikWidget />
    </LazyViewport>
  ),

  bathing: (
    <LazyViewport
      fallback={
        <GothenburgWidgetLoading label="badtemperaturer" />
      }
      rootMargin="500px 0px"
    >
      <BathingWidget />
    </LazyViewport>
  ),
};

export default function GothenburgDashboard() {
  return (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <div className="col-span-12 rounded-3xl border border-blue-300/15 bg-blue-500/[0.07] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-200">
            <MapPin
              size={25}
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              Lokalt
            </p>

            <h2 className="text-xl font-bold text-white">
              Göteborg
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Dagens Göteborg, evenemang,
              kollektivtrafik och badtemperaturer.
            </p>
          </div>
        </div>
      </div>

      <OrderedWidgetGroup
        wrapperClassName="contents"
        itemComponent={
          WidgetGate
        }
        widgets={buildDashboardWidgets(
          gothenburgConfig,
          gothenburgContentMap
        )}
      />
    </div>
  );
}
