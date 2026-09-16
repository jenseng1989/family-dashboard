import "server-only";

import { supabase } from "@/lib/supabase";

import type {
  AppSettings,
  AppTabId,
} from "@/lib/app-settings-client";

const DEFAULT_SETTINGS: AppSettings = {
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

type SettingsRow = {
  setting_key: string;
  setting_value: string;
};

function isValidTab(
  value: string
): value is AppTabId {
  return VALID_TABS.includes(
    value as AppTabId
  );
}

function rowsToSettings(
  rows: SettingsRow[] | null
): AppSettings {
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
  };

  for (const row of rows ?? []) {
    switch (row.setting_key) {
      case "default_tab":
        if (isValidTab(row.setting_value)) {
          settings.defaultTab =
            row.setting_value;
        }
        break;

      case "show_admin_button":
        settings.showAdminButton =
          row.setting_value === "true";
        break;

      case "dashboard_name":
        if (row.setting_value.trim()) {
          settings.dashboardName =
            row.setting_value.trim();
        }
        break;
    }
  }

  return settings;
}

export async function getInitialAppSettings(): Promise<AppSettings> {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value");

    if (error) {
      console.error(
        "Kunde inte läsa initiala appinställningar:",
        error
      );

      return {
        ...DEFAULT_SETTINGS,
      };
    }

    return rowsToSettings(data);
  } catch (error) {
    console.error(
      "Oväntat fel vid hämtning av initiala appinställningar:",
      error
    );

    return {
      ...DEFAULT_SETTINGS,
    };
  }
}