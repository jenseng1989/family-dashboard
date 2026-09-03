"use client";

import {
  Activity,
  ExternalLink,
  Globe2,
  MapPin,
  Ruler,
  Waves,
} from "lucide-react";

import Card from "@/components/ui/Card";
import type {
  EarthData,
  EarthquakeItem,
} from "@/lib/earth-dashboard-types";

function formatMagnitude(
  value: number
): string {
  return value.toFixed(1);
}

function formatEventTime(
  value: string
): string {
  return new Date(value).toLocaleString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getTimeAgo(
  value: string
): string {
  const timestamp =
    new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Okänd tid";
  }

  const minutes = Math.floor(
    Math.max(
      0,
      Date.now() - timestamp
    ) / 60000
  );

  if (minutes < 1) {
    return "Nyss";
  }

  if (minutes < 60) {
    return `${minutes} min sedan`;
  }

  const hours =
    Math.floor(minutes / 60);

  return `${hours} ${
    hours === 1
      ? "timme"
      : "timmar"
  } sedan`;
}

function getMagnitudeClasses(
  magnitude: number
): string {
  if (magnitude >= 7) {
    return "border-red-400/30 bg-red-400/15 text-red-200";
  }

  if (magnitude >= 6) {
    return "border-orange-400/30 bg-orange-400/15 text-orange-200";
  }

  if (magnitude >= 5) {
    return "border-amber-300/25 bg-amber-300/10 text-amber-200";
  }

  return "border-emerald-300/20 bg-emerald-400/10 text-emerald-200";
}

function getMagnitudeInterpretation(
  magnitude: number
) {
  if (magnitude >= 8) {
    return {
      label: "Mycket stor jordbävning",
      description:
        "Ett mycket kraftigt skalv som kan orsaka omfattande skador över stora områden nära epicentrum.",
    };
  }

  if (magnitude >= 7) {
    return {
      label: "Stor jordbävning",
      description:
        "Ett kraftigt skalv som kan orsaka allvarliga skador, särskilt nära epicentrum.",
    };
  }

  if (magnitude >= 6) {
    return {
      label: "Kraftig jordbävning",
      description:
        "Kan orsaka betydande skakningar och lokala skador, beroende på bland annat djup och avstånd till bebyggelse.",
    };
  }

  if (magnitude >= 5) {
    return {
      label: "Stark jordbävning",
      description:
        "Känns ofta tydligt och kan orsaka mindre till måttliga skador nära epicentrum.",
    };
  }

  return {
    label: "Måttlig jordbävning",
    description:
      "Kan kännas tydligt lokalt men orsakar vanligtvis begränsade skador.",
  };
}

function getDepthInterpretation(
  depthKm: number
): string {
  if (depthKm < 70) {
    return "Grunt skalv";
  }

  if (depthKm < 300) {
    return "Mellandjupt skalv";
  }

  return "Djupt skalv";
}

function EarthquakeCard({
  earthquake,
}: {
  earthquake: EarthquakeItem;
}) {
  const interpretation =
    getMagnitudeInterpretation(
      earthquake.magnitude
    );

  const depthInterpretation =
    getDepthInterpretation(
      earthquake.depthKm
    );

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]">
      <div className="flex items-start gap-4">
        <div
          className={[
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-xl font-black",
            getMagnitudeClasses(
              earthquake.magnitude
            ),
          ].join(" ")}
        >
          {formatMagnitude(
            earthquake.magnitude
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold leading-6 text-white">
                {earthquake.place}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {getTimeAgo(
                  earthquake.time
                )}{" "}
                ·{" "}
                {formatEventTime(
                  earthquake.time
                )}
              </p>
            </div>

            <a
              href={earthquake.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Öppna ${earthquake.place} hos USGS`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-emerald-300/20 hover:bg-emerald-400/10 hover:text-emerald-200"
            >
              <ExternalLink size={16} />
            </a>
          </div>

          <div
            className={[
              "mt-4 rounded-xl border px-3 py-3",
              getMagnitudeClasses(
                earthquake.magnitude
              ),
            ].join(" ")}
          >
            <p className="text-sm font-bold">
              {interpretation.label}
            </p>
            <p className="mt-1 text-xs leading-5 opacity-80">
              {interpretation.description}
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/25 px-3 py-2 text-xs text-slate-400">
              <Ruler size={14} className="shrink-0 text-emerald-300" />
              {depthInterpretation} ·{" "}
              {Math.round(
                earthquake.depthKm
              )}{" "}
              km
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/25 px-3 py-2 text-xs text-slate-400">
              <MapPin size={14} className="shrink-0 text-emerald-300" />
              {earthquake.latitude.toFixed(1)}°,{" "}
              {earthquake.longitude.toFixed(1)}°
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/25 px-3 py-2 text-xs text-slate-400">
              <Activity size={14} className="shrink-0 text-emerald-300" />
              Signifikans{" "}
              {earthquake.significance ?? "–"}
            </div>
          </div>

          {earthquake.tsunami && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-xs font-semibold text-blue-200">
              <Waves size={15} />
              USGS-flödet har tsunami-flagga för händelsen
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function EarthEarthquakesWidget({
  data,
  earthquakes,
}: {
  data: EarthData;
  earthquakes: EarthquakeItem[];
}) {
  return (
    <Card
      title="Jordbävningar"
      icon={<Activity size={28} />}
      className="h-full border-emerald-300/15 bg-slate-950/55 hover:bg-slate-950/70"
      storageKey="earth-earthquakes"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-semibold text-white">
            De starkaste M4+ senaste 24 timmarna
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Listan sorteras efter magnitud och uppdateras automatiskt.
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Källa: {data.source}
        </p>
      </div>

      {earthquakes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <Globe2
            size={32}
            className="mx-auto text-emerald-300"
          />

          <p className="mt-3 font-semibold text-white">
            Inga M4+ hittades
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Det finns inga sådana händelser i det aktuella dygnsflödet.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {earthquakes.map((earthquake) => (
            <EarthquakeCard
              key={earthquake.id}
              earthquake={earthquake}
            />
          ))}
        </div>
      )}

      <p className="mt-4 border-t border-white/10 pt-4 text-xs text-slate-500">
        USGS realtidsflöden uppdateras löpande. Magnitud, plats och djup kan justeras när fler mätningar analyseras.
      </p>
    </Card>
  );
}
