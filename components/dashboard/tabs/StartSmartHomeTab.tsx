"use client";

import {
  BedDouble,
  ChefHat,
  HousePlug,
  Lamp,
  Lightbulb,
  MoonStar,
  Power,
  ShieldCheck,
  Sofa,
  Sparkles,
  Thermometer,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  formatTemperature,
  getSmartHomeData,
  getSmartHomeSummary,
  type SmartHomeRoomIcon,
  type SmartHomeSceneIcon,
} from "@/lib/smart-home";

const roomIcons = {
  "living-room": Sofa,
  kitchen: ChefHat,
  bedroom: BedDouble,
} satisfies Record<
  SmartHomeRoomIcon,
  typeof Sofa
>;

const sceneIcons = {
  cozy: Sparkles,
  night: MoonStar,
  "power-off": Power,
} satisfies Record<
  SmartHomeSceneIcon,
  typeof Sparkles
>;

export default function StartSmartHomeTab() {
  const smartHome =
    getSmartHomeData();

  const summary =
    getSmartHomeSummary(
      smartHome
    );

  return (
    <div className="w-full min-w-0 space-y-5">
      <section className="rounded-3xl border border-emerald-300/15 bg-white/[0.08] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.10] text-emerald-200">
              <HousePlug
                size={24}
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                Hemstatus
              </p>

              <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                {
                  smartHome.statusMessage
                }
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Smarthem 0.2
                använder ett separat
                datalager. Just nu
                kommer informationen
                från testdata, men
                samma modell kan
                senare fyllas med
                data från Home
                Assistant.
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/[0.08] px-3 py-1.5 text-xs font-semibold text-emerald-200">
            <Wifi
              size={14}
            />

            {smartHome.mode ===
            "demo"
              ? "Demoläge"
              : "Ansluten"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatusCard
            label="Lampor tända"
            value={`${summary.lightsOn} / ${summary.lightsTotal}`}
            icon={Lightbulb}
          />

          <StatusCard
            label="Temperatur"
            value={formatTemperature(
              summary.averageTemperatureC
            )}
            icon={Thermometer}
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
        <h2 className="font-bold text-white">
          Rum
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Rummen hämtas nu från
          det gemensamma
          Smarthem-datalagret.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {smartHome.rooms.map(
            (room) => {
              const Icon =
                roomIcons[
                  room.icon
                ];

              const StatusIcon =
                room.online
                  ? Wifi
                  : WifiOff;

              return (
                <article
                  key={room.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-200">
                        <Icon
                          size={
                            20
                          }
                        />
                      </div>

                      <div>
                        <h3 className="font-semibold text-white">
                          {
                            room.name
                          }
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {
                            room.status
                          }
                        </p>
                      </div>
                    </div>

                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
                        room.online
                          ? "border-emerald-300/10 bg-emerald-400/[0.06] text-emerald-300"
                          : "border-rose-300/10 bg-rose-400/[0.06] text-rose-300",
                      ].join(
                        " "
                      )}
                    >
                      <StatusIcon
                        size={
                          11
                        }
                      />

                      {room.online
                        ? "Online"
                        : "Offline"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Thermometer
                          size={
                            14
                          }
                        />

                        <span className="text-[10px] font-bold uppercase">
                          Temperatur
                        </span>
                      </div>

                      <p className="mt-2 font-semibold text-white">
                        {formatTemperature(
                          room.temperatureC
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Lamp
                          size={
                            14
                          }
                        />

                        <span className="text-[10px] font-bold uppercase">
                          Lampor
                        </span>
                      </div>

                      <p className="mt-2 font-semibold text-white">
                        {
                          room.lightsOn
                        }{" "}
                        av{" "}
                        {
                          room.lightsTotal
                        }{" "}
                        tända
                      </p>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <h2 className="font-bold text-white">
          Snabbscener
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Scenerna ligger också i
          datalagret och kan senare
          kopplas till riktiga
          Home Assistant-scener.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {smartHome.scenes.map(
            (scene) => {
              const Icon =
                sceneIcons[
                  scene.icon
                ];

              return (
                <button
                  key={scene.id}
                  type="button"
                  disabled={
                    !scene.enabled
                  }
                  title={
                    scene.enabled
                      ? scene.name
                      : "Demoläge – Home Assistant är inte ansluten ännu"
                  }
                  className={[
                    "flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/25 p-4 text-left transition",
                    scene.enabled
                      ? "hover:bg-white/[0.06]"
                      : "cursor-not-allowed opacity-75",
                  ].join(
                    " "
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-200">
                    <Icon
                      size={
                        19
                      }
                    />
                  </div>

                  <div>
                    <p className="font-semibold text-white">
                      {
                        scene.name
                      }
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {
                        scene.description
                      }
                    </p>
                  </div>
                </button>
              );
            }
          )}
        </div>
      </section>
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
        <Icon
          size={15}
        />

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
