
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import {
  BedDouble,
  ChefHat,
  HousePlug,
  Lamp,
  Lightbulb,
  LoaderCircle,
  MoonStar,
  Music2,
  Power,
  RefreshCw,
  ShieldCheck,
  Sofa,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  getSmartHomeData,
  getSmartHomeSummary,
  smartHomeDemoData,
  type SmartHomeData,
  type SmartHomeDevice,
  type SmartHomeRoomIcon,
  type SmartHomeSceneIcon,
} from "@/lib/smart-home";

const REFRESH_INTERVAL = 10000;

const roomIcons = {
  "living-room": Sofa,
  kitchen: ChefHat,
  bedroom: BedDouble,
} satisfies Record<SmartHomeRoomIcon, typeof Sofa>;

const sceneIcons = {
  cozy: Sparkles,
  night: MoonStar,
  "power-off": Power,
} satisfies Record<SmartHomeSceneIcon, typeof Sparkles>;

type DeviceUpdate = {
  isOn?: boolean;
  brightness?: number;
};

type DeviceUpdateResult = {
  ok: boolean;
  error?: string;
};

type DeviceApiResponse = {
  ok?: boolean;
  error?: string;
  device?: SmartHomeDevice;
};

export default function StartSmartHomeTab() {
  const [smartHome, setSmartHome] =
    useState<SmartHomeData>(smartHomeDemoData);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const [updatingDevices, setUpdatingDevices] =
    useState<Set<string>>(new Set());

  const [deviceErrors, setDeviceErrors] =
    useState<Record<string, string>>({});

  const pendingDevices = useRef<Set<string>>(new Set());
  const refreshInProgress = useRef(false);

  useEffect(() => {
    let active = true;

    async function refreshData() {
      if (
        refreshInProgress.current ||
        pendingDevices.current.size > 0
      ) {
        return;
      }

      refreshInProgress.current = true;

      if (active) {
        setRefreshing(true);
      }

      try {
        const data = await getSmartHomeData();

        if (!active) {
          return;
        }

        // Ett styrkommando kan ha startat medan
        // statusförfrågan pågick. Vänta i så fall
        // till nästa uppdatering.
        if (pendingDevices.current.size === 0) {
          setSmartHome(data);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error(
          "Kunde inte uppdatera Smarthem-status:",
          error
        );
      } finally {
        refreshInProgress.current = false;

        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void refreshData();

    const interval = setInterval(() => {
      void refreshData();
    }, REFRESH_INTERVAL);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const summary = getSmartHomeSummary(smartHome);

  const bridgeOffline =
    smartHome.statusMessage ===
    "Smarthemsbryggan är offline";

  const devicesByRoom = useMemo(() => {
    const map = new Map<string, SmartHomeDevice[]>();

    for (const device of smartHome.devices) {
      const current = map.get(device.roomId) ?? [];

      current.push(device);
      map.set(device.roomId, current);
    }

    return map;
  }, [smartHome.devices]);

  async function updateDevice(
    deviceId: string,
    update: DeviceUpdate
  ): Promise<DeviceUpdateResult> {
    if (bridgeOffline) {
      return {
        ok: false,
        error: "Smarthemsbryggan är offline.",
      };
    }

    if (pendingDevices.current.has(deviceId)) {
      return {
        ok: false,
        error: "Enheten uppdateras redan.",
      };
    }

    pendingDevices.current.add(deviceId);

    setUpdatingDevices((current) => {
      const next = new Set(current);
      next.add(deviceId);
      return next;
    });

    setDeviceErrors((current) => {
      const next = { ...current };
      delete next[deviceId];
      return next;
    });

    try {
      const response = await fetch(
        `/api/smart-home/device/${encodeURIComponent(deviceId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(update),
        }
      );

      if (!response.ok) {
        let message = "Kunde inte uppdatera enheten.";

        try {
          const errorData =
            (await response.json()) as DeviceApiResponse;

          if (errorData.error) {
            message = errorData.error;
          }
        } catch {
          // Behåll det generella felmeddelandet.
        }

        throw new Error(message);
      }

      const result =
        (await response.json()) as DeviceApiResponse;

      if (!result.ok || !result.device) {
        throw new Error(
          result.error ??
            "Bryggan bekräftade inte ändringen."
        );
      }

      const updatedDevice = result.device;

      setSmartHome((current) => ({
        ...current,
        devices: current.devices.map((device) =>
          device.id === updatedDevice.id
            ? {
                ...device,
                ...updatedDevice,
              }
            : device
        ),
      }));

      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ett okänt fel inträffade.";

      console.error(
        "Kunde inte uppdatera Smarthem-enheten:",
        error
      );

      setDeviceErrors((current) => ({
        ...current,
        [deviceId]: message,
      }));

      return {
        ok: false,
        error: message,
      };
    } finally {
      pendingDevices.current.delete(deviceId);

      setUpdatingDevices((current) => {
        const next = new Set(current);
        next.delete(deviceId);
        return next;
      });
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <section className="rounded-3xl border border-emerald-300/15 bg-white/[0.08] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.10] text-emerald-200">
              <HousePlug size={24} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                Smarthem
              </p>

              <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                {smartHome.statusMessage}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Smarthem samlar hemmets smarta enheter
                på ett ställe. Integrationen använder
                en fristående lokal brygga.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                bridgeOffline
                  ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                  : "border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-200"
              }`}
            >
              {loading ? (
                <LoaderCircle
                  className="animate-spin"
                  size={14}
                />
              ) : bridgeOffline ? (
                <WifiOff size={14} />
              ) : (
                <Wifi size={14} />
              )}

              {loading
                ? "Hämtar"
                : bridgeOffline
                  ? "Offline"
                  : smartHome.mode === "demo"
                    ? "Testläge"
                    : "Ansluten"}
            </span>

            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <RefreshCw
                size={11}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />

              {lastUpdated
                ? `Uppdaterad ${lastUpdated.toLocaleTimeString(
                    "sv-SE",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }
                  )}`
                : "Väntar på status"}

              {" · Var 10:e sekund"}
            </span>
          </div>
        </div>

        {bridgeOffline && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/[0.08] p-3 text-sm text-rose-200"
          >
            Smarthemsbryggan svarar inte. Styrningen
            är tillfälligt avstängd. Anslutningen
            kontrolleras automatiskt var tionde sekund.
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatusCard
            label="Lampor tända"
            value={
              bridgeOffline
                ? "–"
                : `${summary.lightsOn} / ${summary.lightsTotal}`
            }
            icon={Lightbulb}
          />

          <StatusCard
            label="Högtalare aktiva"
            value={
              bridgeOffline
                ? "–"
                : `${summary.speakersOn} / ${summary.speakersTotal}`
            }
            icon={Music2}
          />

          <StatusCard
            label="Rum"
            value={summary.roomCount.toString()}
            icon={Sofa}
          />

          <StatusCard
            label="Varningar"
            value={summary.warningCount.toString()}
            icon={ShieldCheck}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">
              Rum & enheter
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              All hantering av smarta enheter samlas här.
            </p>
          </div>

          {smartHome.mode === "demo" && (
            <span className="hidden rounded-full border border-amber-300/15 bg-amber-400/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-200 sm:inline-flex">
              Teststyrning
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {smartHome.rooms.map((room) => {
            const Icon = roomIcons[room.icon];

            const StatusIcon = room.online
              ? Wifi
              : WifiOff;

            const devices =
              devicesByRoom.get(room.id) ?? [];

            return (
              <article
                key={room.id}
                className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-200">
                      <Icon size={20} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-white">
                        {room.name}
                      </h3>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {room.status}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                      room.online
                        ? "border-emerald-300/10 bg-emerald-400/[0.06] text-emerald-300"
                        : "border-rose-300/10 bg-rose-400/[0.06] text-rose-300"
                    }`}
                  >
                    <StatusIcon size={11} />

                    {room.online
                      ? "Online"
                      : "Offline"}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {devices.map((device) => (
                    <DeviceRow
                      key={device.id}
                      device={device}
                      updating={updatingDevices.has(
                        device.id
                      )}
                      error={deviceErrors[device.id]}
                      onUpdate={updateDevice}
                    />
                  ))}

                  {devices.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-500">
                      Inga smarta enheter registrerade
                      i rummet.
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <h2 className="font-bold text-white">
          Snabbscener
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Scenerna är förberedda för framtida integrationer.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {smartHome.scenes.map((scene) => {
            const Icon = sceneIcons[scene.icon];

            return (
              <button
                key={scene.id}
                type="button"
                disabled={!scene.enabled}
                title={
                  scene.enabled
                    ? scene.name
                    : "Scenstyrning är inte ansluten ännu"
                }
                className={`flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/25 p-4 text-left transition ${
                  scene.enabled
                    ? "hover:bg-white/[0.06]"
                    : "cursor-not-allowed opacity-75"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-200">
                  <Icon size={19} />
                </div>

                <div>
                  <p className="font-semibold text-white">
                    {scene.name}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {scene.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

type DeviceRowProps = {
  device: SmartHomeDevice;
  updating: boolean;
  error?: string;
  onUpdate: (
    deviceId: string,
    update: DeviceUpdate
  ) => Promise<DeviceUpdateResult>;
};

function DeviceRow({
  device,
  updating,
  error,
  onUpdate,
}: DeviceRowProps) {
  const Icon =
    device.type === "light" ? Lamp : Music2;

  const [localBrightness, setLocalBrightness] =
    useState(device.brightness ?? 100);

  const lastSubmittedBrightness = useRef<number | null>(
    null
  );

  useEffect(() => {
    setLocalBrightness(device.brightness ?? 100);
  }, [device.brightness]);

  const controlsDisabled =
    !device.online || updating;

  async function handleToggle() {
    if (controlsDisabled) {
      return;
    }

    await onUpdate(device.id, {
      isOn: !device.isOn,
    });
  }

  function handleBrightnessChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setLocalBrightness(Number(event.target.value));
  }

  async function commitBrightness(value: number) {
    if (
      controlsDisabled ||
      !device.isOn ||
      device.type !== "light"
    ) {
      return;
    }

    const brightness = Math.max(
      1,
      Math.min(100, Math.round(value))
    );

    if (brightness === device.brightness) {
      return;
    }

    if (
      lastSubmittedBrightness.current === brightness
    ) {
      return;
    }

    lastSubmittedBrightness.current = brightness;

    const result = await onUpdate(device.id, {
      brightness,
    });

    if (!result.ok) {
      setLocalBrightness(device.brightness ?? 100);
    }

    lastSubmittedBrightness.current = null;
  }

  function handleBrightnessRelease(
    event: PointerEvent<HTMLInputElement>
  ) {
    void commitBrightness(
      Number(event.currentTarget.value)
    );
  }

  function handleBrightnessKeyUp(
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
        "PageUp",
        "PageDown",
      ].includes(event.key)
    ) {
      void commitBrightness(
        Number(event.currentTarget.value)
      );
    }
  }

  function handleBrightnessBlur(
    event: FocusEvent<HTMLInputElement>
  ) {
    void commitBrightness(
      Number(event.currentTarget.value)
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              device.isOn
                ? "bg-amber-400/10 text-amber-200"
                : "bg-white/[0.05] text-slate-500"
            }`}
          >
            <Icon size={17} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {device.name}
            </p>

            <p className="mt-0.5 text-[11px] text-slate-500">
              {!device.online
                ? "Offline"
                : updating
                  ? "Uppdaterar…"
                  : device.type === "light"
                    ? device.isOn
                      ? `${device.brightness ?? 100} % ljusstyrka`
                      : "Släckt"
                    : device.status ??
                      (device.isOn
                        ? "Aktiv"
                        : "Pausad")}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={controlsDisabled}
          onClick={() => void handleToggle()}
          title={
            !device.online
              ? "Enheten är offline"
              : device.isOn
                ? "Stäng av"
                : "Slå på"
          }
          className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
            device.isOn
              ? "border-emerald-300/20 bg-emerald-400/20"
              : "border-white/10 bg-slate-900/70"
          } ${
            controlsDisabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer"
          }`}
          aria-label={`${device.isOn ? "Stäng av" : "Slå på"} ${device.name}`}
          aria-pressed={device.isOn}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
              device.isOn ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      {device.type === "light" && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-600">
            <span>Ljusstyrka</span>
            <span>{localBrightness} %</span>
          </div>

          <input
            type="range"
            min="1"
            max="100"
            value={localBrightness}
            disabled={
              controlsDisabled || !device.isOn
            }
            onChange={handleBrightnessChange}
            onPointerUp={handleBrightnessRelease}
            onKeyUp={handleBrightnessKeyUp}
            onBlur={handleBrightnessBlur}
            className="h-1.5 w-full accent-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Ljusstyrka för ${device.name}`}
          />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-rose-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}

type StatusCardProps = {
  label: string;
  value: string;
  icon: typeof Lightbulb;
};

function StatusCard({
  label,
  value,
  icon: Icon,
}: StatusCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={15} />

        <span className="text-[10px] font-bold uppercase tracking-[0.08em]">
          {label}
        </span>
      </div>

      <p className="mt-2 text-lg font-bold text-white">
        {value}
      </p>
    </article>
  );
}