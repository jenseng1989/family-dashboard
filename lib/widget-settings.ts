export type WidgetSize = "full" | "half";
export type WidgetSetting = { widgetId: string; isVisible: boolean; sortOrder: number; size: WidgetSize };
async function jsonResponse(response: Response) {
  if (!response.ok) throw new Error("Widgetinställningen kunde inte hämtas eller sparas.");
  return response.json();
}
export async function getWidgetSettings(): Promise<WidgetSetting[]> {
  const result = await jsonResponse(await fetch("/api/widget-settings", { cache: "no-store", credentials: "same-origin" }));
  return result.settings as WidgetSetting[];
}
async function update(updates: Array<{ widgetId: string; isVisible?: boolean; sortOrder?: number; size?: WidgetSize }>): Promise<void> {
  await jsonResponse(await fetch("/api/widget-settings", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates }) }));
}
export async function setWidgetVisibility(widgetId: string, isVisible: boolean): Promise<void> { await update([{ widgetId, isVisible }]); }
export async function setWidgetOrder(widgetIds: string[]): Promise<void> { await update(widgetIds.map((widgetId, index) => ({ widgetId, sortOrder: (index + 1) * 10 }))); }
export async function setWidgetSize(widgetId: string, size: WidgetSize): Promise<void> { await update([{ widgetId, size }]); }
