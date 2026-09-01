import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type AppSettings = {
  defaultTab: string;
  showAdminButton: boolean;
  dashboardName: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultTab: "home",
  showAdminButton: true,
  dashboardName: "Family Dashboard",
};

const VALID_TABS = [
  "home",
  "weather",
  "family",
  "gothenburg",
  "fun",
] as const;

function rowsToSettings(
  rows:
    | {
        setting_key: string;
        setting_value: string;
      }[]
    | null
): AppSettings {
  const settings = {
    ...DEFAULT_SETTINGS,
  };

  for (const row of rows ?? []) {
    switch (row.setting_key) {
      case "default_tab":
        if (
          VALID_TABS.includes(
            row.setting_value as (typeof VALID_TABS)[number]
          )
        ) {
          settings.defaultTab = row.setting_value;
        }
        break;

      case "show_admin_button":
        settings.showAdminButton =
          row.setting_value === "true";
        break;

      case "dashboard_name":
        settings.dashboardName =
          row.setting_value || DEFAULT_SETTINGS.dashboardName;
        break;
    }
  }

  return settings;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value");

    if (error) {
      console.error(
        "Kunde inte läsa appinställningar:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        settings: rowsToSettings(data),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Oväntat fel vid hämtning av appinställningar:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Appinställningarna kunde inte hämtas.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<AppSettings>;

    const defaultTab =
      typeof body.defaultTab === "string" &&
      VALID_TABS.includes(
        body.defaultTab as (typeof VALID_TABS)[number]
      )
        ? body.defaultTab
        : null;

    const showAdminButton =
      typeof body.showAdminButton === "boolean"
        ? body.showAdminButton
        : null;

    const dashboardName =
      typeof body.dashboardName === "string"
        ? body.dashboardName.trim()
        : null;

    if (
      defaultTab === null ||
      showAdminButton === null ||
      dashboardName === null ||
      dashboardName.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Ogiltiga appinställningar.",
        },
        {
          status: 400,
        }
      );
    }

    const rows = [
      {
        setting_key: "default_tab",
        setting_value: defaultTab,
        updated_at: new Date().toISOString(),
      },
      {
        setting_key: "show_admin_button",
        setting_value: String(showAdminButton),
        updated_at: new Date().toISOString(),
      },
      {
        setting_key: "dashboard_name",
        setting_value: dashboardName,
        updated_at: new Date().toISOString(),
      },
    ];

    const { error } = await supabase
      .from("app_settings")
      .upsert(rows, {
        onConflict: "setting_key",
      });

    if (error) {
      console.error(
        "Kunde inte spara appinställningar:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      settings: {
        defaultTab,
        showAdminButton,
        dashboardName,
      },
    });
  } catch (error) {
    console.error(
      "Oväntat fel när appinställningar skulle sparas:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Appinställningarna kunde inte sparas.",
      },
      {
        status: 500,
      }
    );
  }
}