"use client";

import {
  AlertTriangle,
  ExternalLink,
  Globe2,
  LoaderCircle,
  RefreshCw,
  Rocket,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import Card from "@/components/ui/Card";

type IssData = {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmh: number;
  visibility: string;
  timestamp: string;
  mapsUrl: string;
  source?: string;
  isEstimated?: boolean;
};

type FunData = {
  iss: IssData | null;
  errors: {
    iss: string | null;
    asteroid: string | null;
  };
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("sv-SE").format(value);
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-violet-300/10 bg-slate-950/35 p-3.5 sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300/80">
        {label}
      </p>

      <p className="mt-2 text-base font-bold text-white sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function SpaceError({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
      <p className="flex items-center gap-2 text-sm text-amber-200">
        <AlertTriangle size={17} />
        {message}
      </p>
    </div>
  );
}

function IssWorldMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const markerLeft =
    ((longitude + 180) / 360) * 100;

  const markerTop =
    ((90 - latitude) / 180) * 100;

  return (
    <div className="relative mb-4 aspect-[2/1] overflow-hidden rounded-2xl border border-violet-300/15 bg-[#071426] shadow-inner shadow-black/30 sm:mb-5">
      <svg
        viewBox="0 0 1000 500"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Tydlig schematisk världskarta med ISS-position"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="oceanGradient"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#0b1f3a"
            />
            <stop
              offset="100%"
              stopColor="#102a4a"
            />
          </linearGradient>

          <linearGradient
            id="landGradient"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#34d399"
            />
            <stop
              offset="100%"
              stopColor="#15803d"
            />
          </linearGradient>

          <filter
            id="landShadow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="2"
              floodColor="#000000"
              floodOpacity="0.35"
            />
          </filter>
        </defs>

        <rect
          width="1000"
          height="500"
          fill="url(#oceanGradient)"
        />

        {Array.from({ length: 11 }).map(
          (_, index) => (
            <line
              key={`lon-${index}`}
              x1={index * 100}
              y1="0"
              x2={index * 100}
              y2="500"
              stroke="#93c5fd"
              strokeOpacity="0.12"
              strokeWidth="1"
            />
          )
        )}

        {Array.from({ length: 6 }).map(
          (_, index) => (
            <line
              key={`lat-${index}`}
              x1="0"
              y1={index * 100}
              x2="1000"
              y2={index * 100}
              stroke="#93c5fd"
              strokeOpacity="0.12"
              strokeWidth="1"
            />
          )
        )}

        <path d="M85 105 L135 78 L195 72 L242 92 L270 118 L254 151 L222 171 L211 206 L176 219 L143 199 L112 164 L78 142 Z" fill="url(#landGradient)" stroke="#86efac" strokeWidth="3" filter="url(#landShadow)" />
        <path d="M207 205 L229 214 L245 232 L235 247 L214 239 L197 221 Z" fill="url(#landGradient)" stroke="#86efac" strokeWidth="2" filter="url(#landShadow)" />
        <path d="M257 243 L303 252 L329 284 L323 326 L301 365 L286 414 L260 438 L245 400 L230 354 L216 313 L228 276 Z" fill="url(#landGradient)" stroke="#86efac" strokeWidth="3" filter="url(#landShadow)" />
        <path d="M286 52 L332 38 L359 58 L345 96 L307 104 L282 79 Z" fill="#bbf7d0" stroke="#dcfce7" strokeWidth="2" filter="url(#landShadow)" />
        <path d="M442 118 L470 101 L507 108 L525 128 L510 146 L479 151 L456 141 Z" fill="url(#landGradient)" stroke="#86efac" strokeWidth="3" filter="url(#landShadow)" />
        <path d="M462 157 L509 151 L548 181 L555 227 L533 280 L506 329 L475 312 L451 266 L438 212 Z" fill="url(#landGradient)" stroke="#86efac" strokeWidth="3" filter="url(#landShadow)" />
        <path d="M515 103 L580 77 L666 73 L749 91 L805 123 L793 157 L744 169 L714 196 L667 181 L635 155 L589 157 L552 138 Z" fill="url(#landGradient)" stroke="#86efac" strokeWidth="3" filter="url(#landShadow)" />
        <path d="M629 180 L661 188 L675 222 L653 260 L632 230 L615 201 Z" fill="url(#landGradient)" stroke="#86efac" strokeWidth="2" filter="url(#landShadow)" />
        <path d="M704 190 L742 201 L768 224 L751 245 L721 229 L692 209 Z" fill="url(#landGradient)" stroke="#86efac" strokeWidth="2" filter="url(#landShadow)" />
        <path d="M812 142 L824 151 L817 177 L806 166 Z" fill="#4ade80" stroke="#86efac" strokeWidth="2" />
        <path d="M744 305 L797 286 L850 303 L872 337 L851 375 L800 388 L754 367 L728 336 Z" fill="url(#landGradient)" stroke="#86efac" strokeWidth="3" filter="url(#landShadow)" />
        <path d="M110 462 L220 445 L342 451 L458 440 L573 450 L690 442 L815 454 L910 465 L878 486 L738 490 L590 485 L432 492 L284 485 L151 489 Z" fill="#dbeafe" stroke="#eff6ff" strokeWidth="2" opacity="0.9" />

        <line
          x1="0"
          y1="250"
          x2="1000"
          y2="250"
          stroke="#fbbf24"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeDasharray="8 8"
        />
      </svg>

      <div
        className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{
          left: `${markerLeft}%`,
          top: `${markerTop}%`,
        }}
      >
        <div className="absolute h-14 w-14 animate-ping rounded-full bg-violet-400/25" />

        <div className="relative rounded-full border-2 border-white/70 bg-violet-500 p-2.5 text-white shadow-[0_0_24px_rgba(139,92,246,0.95)]">
          <Rocket size={20} />
        </div>
      </div>

      <div className="absolute bottom-2 left-2 z-10 rounded-lg border border-white/10 bg-slate-950/80 px-2.5 py-1 text-[11px] font-medium text-slate-200 backdrop-blur sm:bottom-3 sm:left-3 sm:px-3 sm:py-1.5 sm:text-xs">
        ISS-position i realtid
      </div>

      <div className="absolute bottom-3 right-3 z-10 hidden rounded-lg border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-300 backdrop-blur sm:block">
        Ekvator markerad i gult
      </div>
    </div>
  );
}

export default function IssWidget() {
  const [data, setData] =
    useState<FunData | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/fun",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `API-fel ${response.status}`
        );
      }

      const result =
        (await response.json()) as FunData;

      setData(result);
    } catch (error) {
      console.error(
        "Kunde inte hämta ISS-data:",
        error
      );

      setErrorMessage(
        "ISS-data kunde inte hämtas."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <Card
      title="Var är ISS?"
      icon={<Rocket size={28} />}
      className="h-full border-violet-300/15 bg-slate-950/55 hover:bg-slate-950/70"
      storageKey="space-iss"
    >
      {isLoading && !data ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03]">
          <LoaderCircle
            size={30}
            className="animate-spin text-violet-300"
          />
          <p className="text-sm text-slate-400">
            Hämtar ISS-position…
          </p>
        </div>
      ) : errorMessage || !data ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={22}
              className="mt-0.5 shrink-0 text-red-300"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-200">
                {errorMessage ?? "ISS-data saknas."}
              </p>
              <button
                type="button"
                onClick={() => void loadData()}
                className="mt-4 flex items-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
              >
                <RefreshCw size={16} />
                Försök igen
              </button>
            </div>
          </div>
        </div>
      ) : data.iss ? (
        <div>
          <IssWorldMap
            latitude={data.iss.latitude}
            longitude={data.iss.longitude}
          />

          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <StatBox
              label="Position"
              value={`${data.iss.latitude}°, ${data.iss.longitude}°`}
            />

            <StatBox
              label="Höjd"
              value={`${formatNumber(
                data.iss.altitudeKm
              )} km`}
            />

            <StatBox
              label="Hastighet"
              value={`${formatNumber(
                data.iss.velocityKmh
              )} km/h`}
            />

            <StatBox
              label="Ljusförhållande"
              value={
                data.iss.visibility === "daylight"
                  ? "Dagsljus"
                  : data.iss.visibility === "eclipsed"
                    ? "Mörker"
                    : "Okänt"
              }
            />
          </div>

          <a
            href={data.iss.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-400/10 px-3.5 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-400/20 sm:px-4"
          >
            <Globe2 size={17} />
            Öppna positionen
            <ExternalLink size={15} />
          </a>
        </div>
      ) : (
        <SpaceError
          message={
            data.errors?.iss ||
            "ISS-data saknas."
          }
        />
      )}
    </Card>
  );
}
