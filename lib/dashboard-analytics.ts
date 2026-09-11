import { supabase } from "@/lib/supabase";

export type DashboardAnalyticsEventType =
  | "dashboard_view"
  | "tab_view";

export type DashboardAnalyticsTabId =
  | "home"
  | "weather"
  | "family"
  | "gothenburg"
  | "fun";

export type DashboardAnalyticsEvent = {
  id: string;
  eventType: DashboardAnalyticsEventType;
  tabId: DashboardAnalyticsTabId | null;
  createdAt: string;
};

type DashboardAnalyticsRow = {
  id: string;
  event_type: DashboardAnalyticsEventType;
  tab_id: DashboardAnalyticsTabId | null;
  created_at: string;
};

export async function trackDashboardEvent(
  eventType: DashboardAnalyticsEventType,
  tabId: DashboardAnalyticsTabId | null = null
): Promise<void> {
  const result = await supabase
    .from("dashboard_analytics")
    .insert({
      event_type: eventType,
      tab_id: tabId,
    });

  if (result.error) {
    console.error(
      "Kunde inte spara dashboard-statistik:",
      result.error
    );
  }
}

export async function getDashboardAnalytics(
  days = 30
): Promise<DashboardAnalyticsEvent[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const result = await supabase
    .from("dashboard_analytics")
    .select("id, event_type, tab_id, created_at")
    .gte("created_at", from.toISOString())
    .order("created_at", { ascending: true });

  if (result.error) {
    console.error(
      "Kunde inte hämta dashboard-statistik:",
      result.error
    );

    throw new Error(
      "Dashboard-statistiken kunde inte hämtas."
    );
  }

  return ((result.data ?? []) as DashboardAnalyticsRow[]).map(
    (row) => ({
      id: row.id,
      eventType: row.event_type,
      tabId: row.tab_id,
      createdAt: row.created_at,
    })
  );
}
