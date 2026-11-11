"use client";

import {
  AlertTriangle,
  ExternalLink,
  Globe2,
  LoaderCircle,
  LocateFixed,
  Minus,
  Plus,
  RefreshCw,
  Rocket,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

// OpenStreetMap tiles use Web Mercator coordinates. The ISS position is
// projected with the same formula, keeping the marker geographically correct.
const TILE_SIZE = 256;
const MAX_LATITUDE = 85.05112878;

function toWorld(latitude: number, longitude: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const lat = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function fromWorld(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = ((x / scale) * 360 + 180) % 360 - 180;
  const latitude = (Math.atan(Math.sinh(Math.PI * (1 - 2 * y / scale))) * 180) / Math.PI;
  return { latitude, longitude };
}

function IssWorldMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [zoom, setZoom] = useState(2);
  const [center, setCenter] = useState({ latitude, longitude });
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; centerX: number; centerY: number } | null>(null);

  useEffect(() => {
    const node = mapRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setDimensions({ width: rect.width, height: rect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const centerPoint = toWorld(center.latitude, center.longitude, zoom);
  const issPoint = toWorld(latitude, longitude, zoom);
  const worldWidth = TILE_SIZE * 2 ** zoom;
  let markerDx = issPoint.x - centerPoint.x;
  if (markerDx > worldWidth / 2) markerDx -= worldWidth;
  if (markerDx < -worldWidth / 2) markerDx += worldWidth;
  const markerX = dimensions.width / 2 + markerDx;
  const markerY = dimensions.height / 2 + issPoint.y - centerPoint.y;

  const tiles = useMemo(() => {
    const middle = toWorld(center.latitude, center.longitude, zoom);
    const count = 2 ** zoom;
    const startX = Math.floor((middle.x - dimensions.width / 2) / TILE_SIZE);
    const endX = Math.floor((middle.x + dimensions.width / 2) / TILE_SIZE);
    const startY = Math.max(0, Math.floor((middle.y - dimensions.height / 2) / TILE_SIZE));
    const endY = Math.min(count - 1, Math.floor((middle.y + dimensions.height / 2) / TILE_SIZE));
    const result: { key: string; url: string; left: number; top: number }[] = [];
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const wrappedX = ((x % count) + count) % count;
        result.push({
          key: `${zoom}-${x}-${y}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
          left: dimensions.width / 2 + x * TILE_SIZE - middle.x,
          top: dimensions.height / 2 + y * TILE_SIZE - middle.y,
        });
      }
    }
    return result;
  }, [center.latitude, center.longitude, zoom, dimensions.width, dimensions.height]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const point = toWorld(center.latitude, center.longitude, zoom);
    dragRef.current = { x: event.clientX, y: event.clientY, centerX: point.x, centerY: point.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const x = drag.centerX - (event.clientX - drag.x);
    const y = Math.max(0, Math.min(worldWidth, drag.centerY - (event.clientY - drag.y)));
    setCenter(fromWorld(x, y, zoom));
  }

  function onPointerUp() { dragRef.current = null; }

  return (
    <div className="relative mb-4 aspect-[2/1] min-h-[240px] overflow-hidden rounded-2xl border border-violet-300/15 bg-[#071426] shadow-inner shadow-black/30 sm:mb-5">
      <div
        ref={mapRef}
        className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Interaktiv OpenStreetMap-världskarta med ISS-position"
        role="img"
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            draggable={false}
            width={TILE_SIZE}
            height={TILE_SIZE}
            className="pointer-events-none absolute max-w-none"
            style={{ left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}
          />
        ))}
        {markerX >= -20 && markerX <= dimensions.width + 20 && markerY >= -20 && markerY <= dimensions.height + 20 && (
          <div
            className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ left: markerX, top: markerY }}
          >
            <div className="absolute h-12 w-12 animate-ping rounded-full bg-violet-500/25" />
            <div className="relative rounded-full border-2 border-white/90 bg-violet-600 p-2 text-white shadow-[0_0_22px_rgba(139,92,246,0.95)]">
              <Rocket size={19} />
            </div>
          </div>
        )}
      </div>
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
        <button type="button" aria-label="Zooma in" onClick={() => setZoom((z) => Math.min(6, z + 1))} className="rounded-lg border border-white/20 bg-slate-950/85 p-2 text-white hover:bg-slate-800"><Plus size={17} /></button>
        <button type="button" aria-label="Zooma ut" onClick={() => setZoom((z) => Math.max(1, z - 1))} className="rounded-lg border border-white/20 bg-slate-950/85 p-2 text-white hover:bg-slate-800"><Minus size={17} /></button>
        <button type="button" aria-label="Centrera på ISS" onClick={() => setCenter({ latitude, longitude })} className="rounded-lg border border-white/20 bg-slate-950/85 p-2 text-white hover:bg-slate-800"><LocateFixed size={17} /></button>
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-lg border border-white/10 bg-slate-950/85 px-2.5 py-1 text-[11px] text-slate-100 backdrop-blur sm:bottom-3 sm:left-3">
        ISS-position • Dra för att flytta kartan
      </div>
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 z-20 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-slate-900 hover:underline">© OpenStreetMap</a>
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

  const fetchData = useCallback(() => {
    return fetch("/api/fun", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`API-fel ${response.status}`);
        }
        const result = (await response.json()) as FunData;
        setData(result);
      })
      .catch((error) => {
        console.error("Kunde inte hämta ISS-data:", error);

        setErrorMessage("ISS-data kunde inte hämtas.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    return fetchData();
  }, [fetchData]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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
