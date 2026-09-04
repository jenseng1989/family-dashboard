"use client";

export type AppTabId =
  | "home"
  | "weather"
  | "family"
  | "gothenburg"
  | "fun";

export type AppSettings = {
  defaultTab: AppTabId;
  showAdminButton: boolean;
  dashboardName: string;
};

type AppSettingsResponse = {
  settings?: Partial<AppSettings>;
  error?: string;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultTab: "home",
  showAdminButton: true,
  dashboardName: "Family Dashboard",
};

const VALID_TABS: AppTabId[] = [
  "home",
  "weather",
  "family",
  "gothenburg",
  "fun",
];

const CACHE_TTL_MS = 10_000;

let cachedSettings: AppSettings | null = null;
let cachedAt = 0;
let inFlightRequest: Promise<AppSettings> | null = null;

function isValidTab(
  value: unknown
): value is AppTabId {
  return (
    typeof value === "string" &&
    VALID_TABS.includes(value as AppTabId)
  );
}

function normalizeSettings(
  settings: Partial<AppSettings> | undefined
): AppSettings {
  const defaultTab = isValidTab(
    settings?.defaultTab
  )
    ? settings.defaultTab
    : DEFAULT_APP_SETTINGS.defaultTab;

  const showAdminButton =
    typeof settings?.showAdminButton ===
    "boolean"
      ? settings.showAdminButton
      : DEFAULT_APP_SETTINGS.showAdminButton;

  const dashboardName =
    typeof settings?.dashboardName ===
      "string" &&
    settings.dashboardName.trim()
      ? settings.dashboardName.trim()
      : DEFAULT_APP_SETTINGS.dashboardName;

  return {
    defaultTab,
    showAdminButton,
    dashboardName,
  };
}

async function fetchAppSettings(): Promise<AppSettings> {
  const response = await fetch(
    "/api/admin/app-settings",
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const result =
    (await response.json()) as AppSettingsResponse;

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

  return normalizeSettings(
    result.settings
  );
}

export async function getAppSettings(): Promise<AppSettings> {
  const now = Date.now();

  if (
    cachedSettings &&
    now - cachedAt < CACHE_TTL_MS
  ) {
    return cachedSettings;
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = fetchAppSettings()
    .then((settings) => {
      cachedSettings = settings;
      cachedAt = Date.now();

      return settings;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

export function clearAppSettingsCache() {
  cachedSettings = null;
  cachedAt = 0;
  inFlightRequest = null;
}
