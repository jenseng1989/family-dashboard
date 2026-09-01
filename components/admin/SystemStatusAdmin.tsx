"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bath,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CloudSun,
  Coins,
  Database,
  Flame,
  Globe2,
  LoaderCircle,
  RefreshCw,
  Satellite,
  ShieldAlert,
  TramFront,
  TriangleAlert,
  Wind,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ServiceGroup =
  | "System"
  | "Vardagen"
  | "Göteborg"
  | "Utforska";

type ServiceState =
  | "checking"
  | "healthy"
  | "warning"
  | "error";

type ServiceDefinition = {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  group: ServiceGroup;
  icon: LucideIcon;
};

type ServiceStatus = ServiceDefinition & {
  status: ServiceState;
  responseTime: number | null;
  checkedAt: string | null;
  message: string | null;
};

const services: ServiceDefinition[] = [
  /*
   * SYSTEM
   */
  {
    id: "database",
    name: "Supabase / Databas",
    description:
      "Kontrollerar anslutningen till Family Dashboards databas.",
    endpoint: "/api/admin/database-status",
    group: "System",
    icon: Database,
  },

  /*
   * VARDAGEN
   */
  {
    id: "everyday-weather",
    name: "Väder",
    description:
      "Väderdata för vardagsöversikten.",
    endpoint: "/api/everyday-weather",
    group: "Vardagen",
    icon: CloudSun,
  },
  {
    id: "electricity",
    name: "Elpris",
    description:
      "Elpriser för elområde SE3.",
    endpoint: "/api/electricity",
    group: "Vardagen",
    icon: Coins,
  },
  {
    id: "today-status",
    name: "Today Status",
    description:
      "Dagens familjehändelser och SMHI-varningar.",
    endpoint: "/api/today-status",
    group: "Vardagen",
    icon: ShieldAlert,
  },
  {
    id: "calendar",
    name: "Kalender",
    description:
      "Kontroll av kalenderns ICS-källa.",
    endpoint: "/api/calendar",
    group: "Vardagen",
    icon: CalendarDays,
  },

  /*
   * GÖTEBORG
   */
  {
    id: "vasttrafik",
    name: "Västtrafik",
    description:
      "Avgångar från Vågmästareplatsen.",
    endpoint: "/api/vasttrafik",
    group: "Göteborg",
    icon: TramFront,
  },
  {
    id: "air-quality",
    name: "Luftkvalitet",
    description:
      "Aktuell luftkvalitet i Göteborg.",
    endpoint: "/api/air-quality",
    group: "Göteborg",
    icon: Wind,
  },
  {
    id: "bathing",
    name: "Badtemperaturer",
    description:
      "Badplatser och temperaturdata i Göteborg.",
    endpoint: "/api/bathing",
    group: "Göteborg",
    icon: Bath,
  },

  /*
   * UTFORSKA
   */
  {
    id: "earth",
    name: "Jordbävningar",
    description:
      "Jordbävningsdata från USGS.",
    endpoint: "/api/earth",
    group: "Utforska",
    icon: Globe2,
  },
  {
    id: "satellites",
    name: "Satelliter",
    description:
      "Satellitpassager via N2YO.",
    endpoint: "/api/satellites",
    group: "Utforska",
    icon: Satellite,
  },
  {
    id: "space-weather",
    name: "Rymdväder",
    description:
      "Rymdväderdata från NOAA SWPC.",
    endpoint: "/api/space-weather",
    group: "Utforska",
    icon: TriangleAlert,
  },
  {
    id: "volcanoes",
    name: "Vulkaner",
    description:
      "Aktuella vulkanutbrott från Smithsonian.",
    endpoint: "/api/volcanoes",
    group: "Utforska",
    icon: Flame,
  },
];

function createInitialStatuses(): ServiceStatus[] {
  return services.map((service) => ({
    ...service,
    status: "checking",
    responseTime: null,
    checkedAt: null,
    message: null,
  }));
}

function getErrorMessage(
  body: unknown,
  fallback: string
): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error?: unknown }).error ===
      "string"
  ) {
    return (body as { error: string }).error;
  }

  return fallback;
}

function evaluateSuccessfulResponse(
  service: ServiceDefinition,
  body: unknown
): {
  status: Exclude<ServiceState, "checking">;
  message: string | null;
} {
  if (
    typeof body !== "object" ||
    body === null
  ) {
    return {
      status: "healthy",
      message: null,
    };
  }

  const data = body as Record<string, unknown>;

  /*
   * SUPABASE
   */
  if (service.id === "database") {
    if (data.status !== "healthy") {
      return {
        status: "error",
        message:
          typeof data.error === "string"
            ? data.error
            : "Databasen svarar inte som förväntat.",
      };
    }

    const records =
      typeof data.records === "number"
        ? data.records
        : null;

    return {
      status: "healthy",
      message:
        records !== null
          ? `Databasen svarar. ${records} familjemedlemmar hittades.`
          : "Databasen svarar.",
    };
  }

  /*
   * TODAY STATUS
   */
  if (service.id === "today-status") {
    if (data.partialError === true) {
      return {
        status: "warning",
        message:
          "Today Status svarar, men SMHI-delen kunde inte hämtas.",
      };
    }
  }

  /*
   * KALENDER
   */
  if (service.id === "calendar") {
    if (typeof data.error === "string") {
      return {
        status: "warning",
        message: data.error,
      };
    }

    if (data.hasUrl !== true) {
      return {
        status: "warning",
        message:
          "Kalendern svarar men ingen verifierad ICS-källa rapporterades.",
      };
    }
  }

  /*
   * SATELLITER
   */
  if (service.id === "satellites") {
    const satellites =
      Array.isArray(data.satellites)
        ? data.satellites
        : [];

    const failed = satellites.filter(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "error" in item
    ).length;

    if (failed > 0) {
      return {
        status: "warning",
        message: `${failed} satellit${
          failed === 1 ? "" : "er"
        } kunde inte hämtas.`,
      };
    }
  }

  /*
   * RYMDVÄDER
   */
  if (service.id === "space-weather") {
    const rawStatus = data.dataStatus;

    if (
      typeof rawStatus === "object" &&
      rawStatus !== null
    ) {
      const status =
        rawStatus as Record<string, unknown>;

      const values = [
        status.kp,
        status.kpForecast,
        status.magneticField,
        status.plasma,
      ];

      const available = values.filter(
        (value) => value === true
      ).length;

      if (available === 0) {
        return {
          status: "error",
          message:
            "NOAA svarar inte med någon användbar rymdväderdata.",
        };
      }

      if (available < values.length) {
        return {
          status: "warning",
          message: `${available} av ${values.length} rymdväderkällor innehåller data.`,
        };
      }
    }
  }

  return {
    status: "healthy",
    message: null,
  };
}

async function checkService(
  service: ServiceDefinition
): Promise<ServiceStatus> {
  const startedAt = performance.now();

  try {
    const response = await fetch(
      service.endpoint,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const responseTime = Math.round(
      performance.now() - startedAt
    );

    let body: unknown = null;

    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      return {
        ...service,
        status: "error",
        responseTime,
        checkedAt:
          new Date().toISOString(),
        message: getErrorMessage(
          body,
          `API-fel ${response.status}`
        ),
      };
    }

    const evaluation =
      evaluateSuccessfulResponse(
        service,
        body
      );

    return {
      ...service,
      status: evaluation.status,
      responseTime,
      checkedAt:
        new Date().toISOString(),
      message: evaluation.message,
    };
  } catch (error) {
    return {
      ...service,
      status: "error",
      responseTime: Math.round(
        performance.now() - startedAt
      ),
      checkedAt:
        new Date().toISOString(),
      message:
        error instanceof Error
          ? error.message
          : "Tjänsten kunde inte kontrolleras.",
    };
  }
}

function formatCheckedAt(
  value: string | null
): string {
  if (!value) {
    return "–";
  }

  return new Date(
    value
  ).toLocaleTimeString(
    "sv-SE",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

function getStatusLabel(
  status: ServiceState
): string {
  switch (status) {
    case "checking":
      return "Kontrollerar";

    case "healthy":
      return "Fungerar";

    case "warning":
      return "Varning";

    case "error":
      return "Problem";
  }
}

function getStatusClasses(
  status: ServiceState
): string {
  switch (status) {
    case "checking":
      return "border-blue-300/15 bg-blue-400/[0.06] text-blue-300";

    case "healthy":
      return "border-emerald-300/15 bg-emerald-400/[0.06] text-emerald-300";

    case "warning":
      return "border-amber-300/15 bg-amber-400/[0.06] text-amber-300";

    case "error":
      return "border-red-300/15 bg-red-400/[0.06] text-red-300";
  }
}

function StatusIcon({
  status,
}: {
  status: ServiceState;
}) {
  if (status === "checking") {
    return (
      <LoaderCircle
        size={12}
        className="animate-spin"
      />
    );
  }

  if (status === "healthy") {
    return <CheckCircle2 size={12} />;
  }

  if (status === "warning") {
    return <AlertTriangle size={12} />;
  }

  return <CircleAlert size={12} />;
}

export default function SystemStatusAdmin() {
  const [
    statuses,
    setStatuses,
  ] =
    useState<ServiceStatus[]>(
      createInitialStatuses
    );

  const [
    isChecking,
    setIsChecking,
  ] = useState(true);

  const runChecks =
    useCallback(async () => {
      setIsChecking(true);

      setStatuses((current) =>
        current.map((service) => ({
          ...service,
          status: "checking",
          message: null,
        }))
      );

      const results =
        await Promise.all(
          services.map(
            (service) =>
              checkService(service)
          )
        );

      setStatuses(results);
      setIsChecking(false);
    }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  const healthyCount =
    useMemo(
      () =>
        statuses.filter(
          (item) =>
            item.status ===
            "healthy"
        ).length,
      [statuses]
    );

  const warningCount =
    useMemo(
      () =>
        statuses.filter(
          (item) =>
            item.status ===
            "warning"
        ).length,
      [statuses]
    );

  const errorCount =
    useMemo(
      () =>
        statuses.filter(
          (item) =>
            item.status ===
            "error"
        ).length,
      [statuses]
    );

  const overallStatus:
    | "checking"
    | "healthy"
    | "warning"
    | "error" =
    isChecking
      ? "checking"
      : errorCount > 0
        ? "error"
        : warningCount > 0
          ? "warning"
          : "healthy";

  const groups: ServiceGroup[] = [
    "System",
    "Vardagen",
    "Göteborg",
    "Utforska",
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Till Admin
          </Link>

          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                <Activity size={28} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  Kontrollrum
                </p>

                <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  Systemstatus
                </h1>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                  Hälsokontroll av dashboardens
                  viktigaste datakällor, API:er
                  och databas.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void runChecks()
              }
              disabled={isChecking}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/15 hover:text-white disabled:cursor-wait disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={
                  isChecking
                    ? "animate-spin"
                    : ""
                }
              />
              Kontrollera igen
            </button>
          </div>
        </header>

        {/* TOTAL STATUS */}
        <section
          className={[
            "mt-5 rounded-3xl border p-5",
            getStatusClasses(
              overallStatus
            ),
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            {overallStatus ===
            "checking" ? (
              <LoaderCircle
                size={23}
                className="animate-spin"
              />
            ) : overallStatus ===
              "healthy" ? (
              <CheckCircle2
                size={23}
              />
            ) : overallStatus ===
              "warning" ? (
              <AlertTriangle
                size={23}
              />
            ) : (
              <CircleAlert
                size={23}
              />
            )}

            <div>
              <p className="font-bold text-white">
                {overallStatus ===
                "checking"
                  ? "Kontrollerar tjänster…"
                  : overallStatus ===
                      "healthy"
                    ? "Alla kontrollerade tjänster fungerar"
                    : overallStatus ===
                        "warning"
                      ? "Tjänsterna fungerar, men det finns varningar"
                      : `${errorCount} tjänst${
                          errorCount === 1
                            ? ""
                            : "er"
                        } har problem`}
              </p>

              <p className="mt-1 text-sm text-slate-300">
                {healthyCount} fungerar
                {" · "}
                {warningCount} varningar
                {" · "}
                {errorCount} problem
                {" · "}
                {services.length} totalt
              </p>
            </div>
          </div>
        </section>

        {/* SERVICE GROUPS */}
        {groups.map((group) => {
          const groupServices =
            statuses.filter(
              (service) =>
                service.group === group
            );

          return (
            <section
              key={group}
              className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <h2 className="font-bold text-white">
                  {group}
                </h2>

                <span className="text-xs font-semibold text-slate-500">
                  {groupServices.length}{" "}
                  {groupServices.length === 1
                    ? "tjänst"
                    : "tjänster"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
                {groupServices.map(
                  (service) => {
                    const Icon =
                      service.icon;

                    return (
                      <article
                        key={service.id}
                        className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200">
                            <Icon
                              size={21}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="font-semibold text-white">
                                {
                                  service.name
                                }
                              </h3>

                              <span
                                className={[
                                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                                  getStatusClasses(
                                    service.status
                                  ),
                                ].join(
                                  " "
                                )}
                              >
                                <StatusIcon
                                  status={
                                    service.status
                                  }
                                />

                                {getStatusLabel(
                                  service.status
                                )}
                              </span>
                            </div>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                              {
                                service.description
                              }
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                  Svarstid
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-200">
                                  {service.responseTime ===
                                  null
                                    ? "–"
                                    : `${service.responseTime} ms`}
                                </p>
                              </div>

                              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                  Kontrollerad
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-200">
                                  {formatCheckedAt(
                                    service.checkedAt
                                  )}
                                </p>
                              </div>
                            </div>

                            {service.message && (
                              <div
                                className={[
                                  "mt-3 rounded-xl border px-3 py-2 text-xs leading-5",
                                  service.status ===
                                  "healthy"
                                    ? "border-emerald-300/10 bg-emerald-400/[0.05] text-emerald-200"
                                    : service.status ===
                                        "warning"
                                      ? "border-amber-300/10 bg-amber-400/[0.05] text-amber-200"
                                      : "border-red-300/10 bg-red-400/[0.05] text-red-200",
                                ].join(
                                  " "
                                )}
                              >
                                {
                                  service.message
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}