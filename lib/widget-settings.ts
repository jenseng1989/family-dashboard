import { supabase } from "@/lib/supabase";

export type WidgetSetting = {
  widgetId: string;
  isVisible: boolean;
  sortOrder: number;
};

type WidgetSettingRow = {
  widget_id: string;
  is_visible: boolean;
  sort_order: number;
};

export async function getWidgetSettings(): Promise<WidgetSetting[]> {
  const result = await supabase
    .from("widget_settings")
    .select("widget_id, is_visible, sort_order")
    .order("sort_order", {
      ascending: true,
    });

  if (result.error) {
    console.error(
      "Kunde inte hämta widgetinställningar:",
      result.error
    );

    throw new Error(
      "Kunde inte hämta widgetinställningarna."
    );
  }

  return ((result.data ?? []) as WidgetSettingRow[]).map(
    (row) => ({
      widgetId: row.widget_id,
      isVisible: row.is_visible,
      sortOrder: row.sort_order,
    })
  );
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
    console.error(
      `Kunde inte uppdatera widget "${widgetId}":`,
      result.error
    );

    throw new Error(
      "Widgetinställningen kunde inte sparas."
    );
  }
}


export async function setWidgetOrder(
  widgetIds: string[]
): Promise<void> {
  const updates = widgetIds.map((widgetId, index) => ({
    widget_id: widgetId,
    sort_order: (index + 1) * 10,
    updated_at: new Date().toISOString(),
  }));

  for (const update of updates) {
    const result = await supabase
      .from("widget_settings")
      .update({
        sort_order: update.sort_order,
        updated_at: update.updated_at,
      })
      .eq("widget_id", update.widget_id);

    if (result.error) {
      console.error(
        `Kunde inte uppdatera ordningen för widget "${update.widget_id}":`,
        result.error
      );
      throw new Error("Widgetordningen kunde inte sparas.");
    }
  }
}
