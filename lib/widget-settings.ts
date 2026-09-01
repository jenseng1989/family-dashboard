import { supabase } from "@/lib/supabase";

export type WidgetSize = "full" | "half";

export type WidgetSetting = {
  widgetId: string;
  isVisible: boolean;
  sortOrder: number;
  size: WidgetSize;
};

type WidgetSettingRow = {
  widget_id: string;
  is_visible: boolean;
  sort_order: number;
  size: WidgetSize | null;
};

export async function getWidgetSettings(): Promise<WidgetSetting[]> {
  const result = await supabase
    .from("widget_settings")
    .select("widget_id, is_visible, sort_order, size")
    .order("sort_order", { ascending: true });

  if (result.error) {
    console.error("Kunde inte hämta widgetinställningar:", result.error);
    throw new Error("Kunde inte hämta widgetinställningarna.");
  }

  return ((result.data ?? []) as WidgetSettingRow[]).map((row) => ({
    widgetId: row.widget_id,
    isVisible: row.is_visible,
    sortOrder: row.sort_order,
    size: row.size ?? "full",
  }));
}

export async function setWidgetVisibility(
  widgetId: string,
  isVisible: boolean
): Promise<void> {
  const result = await supabase
    .from("widget_settings")
    .update({
      is_visible: isVisible,
      updated_at: new Date().toISOString(),
    })
    .eq("widget_id", widgetId);

  if (result.error) {
    console.error(`Kunde inte uppdatera widget "${widgetId}":`, result.error);
    throw new Error("Widgetinställningen kunde inte sparas.");
  }
}

export async function setWidgetOrder(widgetIds: string[]): Promise<void> {
  for (const [index, widgetId] of widgetIds.entries()) {
    const result = await supabase
      .from("widget_settings")
      .update({
        sort_order: (index + 1) * 10,
        updated_at: new Date().toISOString(),
      })
      .eq("widget_id", widgetId);

    if (result.error) {
      console.error(
        `Kunde inte uppdatera ordningen för widget "${widgetId}":`,
        result.error
      );
      throw new Error("Widgetordningen kunde inte sparas.");
    }
  }
}

export async function setWidgetSize(
  widgetId: string,
  size: WidgetSize
): Promise<void> {
  const result = await supabase
    .from("widget_settings")
    .update({
      size,
      updated_at: new Date().toISOString(),
    })
    .eq("widget_id", widgetId);

  if (result.error) {
    console.error(
      `Kunde inte uppdatera storleken för widget "${widgetId}":`,
      result.error
    );
    throw new Error("Widgetstorleken kunde inte sparas.");
  }
}
