"use client";

import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Home,
  LoaderCircle,
  RotateCcw,
  Save,
  Settings,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

type TabId =
  | "home"
  | "weather"
  | "family"
  | "gothenburg"
  | "fun";

type AppSettings = {
  defaultTab: TabId;
  showAdminButton: boolean;
  dashboardName: string;
};

type ApiResponse = {
  settings?: AppSettings;
  error?: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultTab: "home",
  showAdminButton: true,
  dashboardName: "Family Dashboard",
};

const tabOptions: {
  id: TabId;
  label: string;
  description: string;
}[] = [
  {
    id: "home",
    label: "Start",
    description: "Dashboardens startsida.",
  },
  {
    id: "weather",
    label: "Väder",
    description: "Väderprognos, luftkvalitet och pollen.",
  },
  {
    id: "family",
    label: "Familjen",
    description: "Familjens gemensamma och personliga innehåll.",
  },
  {
    id: "gothenburg",
    label: "Göteborg",
    description: "Lokala funktioner för Göteborg.",
  },
  {
    id: "fun",
    label: "Utforska",
    description: "Rymd, jord och andra utforskarfunktioner.",
  },
];

export default function AppSettingsAdmin() {
  const [settings, setSettings] =
    useState<AppSettings>(DEFAULT_SETTINGS);

  const [savedSettings, setSavedSettings] =
    useState<AppSettings>(DEFAULT_SETTINGS);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/admin/app-settings",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            `API-fel ${response.status}`
        );
      }

      if (!result.settings) {
        throw new Error(
          "API:t returnerade inga appinställningar."
        );
      }

      setSettings(result.settings);
      setSavedSettings(result.settings);
    } catch (err) {
      console.error(
        "Kunde inte läsa appinställningar:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Appinställningarna kunde inte hämtas."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const hasChanges =
    settings.defaultTab !== savedSettings.defaultTab ||
    settings.showAdminButton !==
      savedSettings.showAdminButton ||
    settings.dashboardName !==
      savedSettings.dashboardName;

  async function saveSettings() {
    const dashboardName =
      settings.dashboardName.trim();

    if (!dashboardName) {
      setError(
        "Dashboardens namn får inte vara tomt."
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        "/api/admin/app-settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...settings,
            dashboardName,
          }),
        }
      );

      const result =
        (await response.json()) as ApiResponse & {
          success?: boolean;
        };

      if (!response.ok) {
        throw new Error(
          result.error ??
            `API-fel ${response.status}`
        );
      }

      const updatedSettings =
        result.settings ?? {
          ...settings,
          dashboardName,
        };

      setSettings(updatedSettings);
      setSavedSettings(updatedSettings);

      setSuccessMessage(
        "Appinställningarna har sparats."
      );
    } catch (err) {
      console.error(
        "Kunde inte spara appinställningar:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Appinställningarna kunde inte sparas."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function resetChanges() {
    setSettings(savedSettings);
    setError(null);
    setSuccessMessage(null);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4">
          <div className="flex items-center gap-3 text-slate-300">
            <LoaderCircle
              size={22}
              className="animate-spin"
            />
            <span className="text-sm font-semibold">
              Hämtar appinställningar…
            </span>
          </div>
        </div>
      </main>
    );
  }

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

          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-400/[0.08] text-amber-200">
              <Settings size={28} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">
                Administration
              </p>

              <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                Appinställningar
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Globala inställningar för hur Family Dashboard
                ska starta och bete sig.
              </p>
            </div>
          </div>
        </header>

        {/* DASHBOARD NAME */}
        <section className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200">
              <Home size={21} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-white">
                Dashboardnamn
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Namnet som ska användas för familjens dashboard.
              </p>

              <div className="mt-4 max-w-xl">
                <label
                  htmlFor="dashboard-name"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                >
                  Namn
                </label>

                <input
                  id="dashboard-name"
                  type="text"
                  maxLength={60}
                  value={settings.dashboardName}
                  onChange={(event) => {
                    setSettings((current) => ({
                      ...current,
                      dashboardName:
                        event.target.value,
                    }));

                    setSuccessMessage(null);
                  }}
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Family Dashboard"
                />

                <p className="mt-2 text-xs text-slate-500">
                  {settings.dashboardName.length}/60 tecken
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DEFAULT TAB */}
        <section className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <h2 className="font-bold text-white">
            Standardflik
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-400">
            Välj vilken huvudflik som ska visas när
            dashboarden öppnas.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tabOptions.map((tab) => {
              const selected =
                settings.defaultTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSettings((current) => ({
                      ...current,
                      defaultTab: tab.id,
                    }));

                    setSuccessMessage(null);
                  }}
                  className={[
                    "relative rounded-2xl border p-4 text-left transition",
                    selected
                      ? "border-blue-400/40 bg-blue-500/10"
                      : "border-white/10 bg-slate-950/25 hover:border-white/20 hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={[
                          "font-semibold",
                          selected
                            ? "text-blue-200"
                            : "text-white",
                        ].join(" ")}
                      >
                        {tab.label}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {tab.description}
                      </p>
                    </div>

                    <div
                      className={[
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                        selected
                          ? "border-blue-400 bg-blue-500 text-white"
                          : "border-white/15 text-transparent",
                      ].join(" ")}
                    >
                      <Check size={14} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ADMIN BUTTON */}
        <section className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={[
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  settings.showAdminButton
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-white/10 text-slate-400",
                ].join(" ")}
              >
                {settings.showAdminButton ? (
                  <Eye size={21} />
                ) : (
                  <EyeOff size={21} />
                )}
              </div>

              <div>
                <h2 className="font-bold text-white">
                  Visa Admin-knappen
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                  Bestämmer om kugghjulet för Admin ska
                  visas bredvid dashboardens huvudflikar.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.showAdminButton}
              onClick={() => {
                setSettings((current) => ({
                  ...current,
                  showAdminButton:
                    !current.showAdminButton,
                }));

                setSuccessMessage(null);
              }}
              className={[
                "relative h-8 w-14 shrink-0 rounded-full border transition",
                settings.showAdminButton
                  ? "border-blue-400/40 bg-blue-500"
                  : "border-white/10 bg-slate-700",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
                  settings.showAdminButton
                    ? "translate-x-7"
                    : "translate-x-1",
                ].join(" ")}
              />
            </button>
          </div>
        </section>

        {/* STATUS */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-300/15 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">
            {successMessage}
          </div>
        )}

        {/* ACTIONS */}
        <div className="mt-5 flex flex-col-reverse gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              {hasChanges
                ? "Du har osparade ändringar"
                : "Alla ändringar är sparade"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Inställningarna lagras centralt i Supabase.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={resetChanges}
              disabled={!hasChanges || isSaving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={17} />
              Ångra ändringar
            </button>

            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={!hasChanges || isSaving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? (
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Save size={17} />
              )}

              {isSaving
                ? "Sparar…"
                : "Spara ändringar"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}