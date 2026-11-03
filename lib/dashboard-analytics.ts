

export type DashboardAnalyticsEventType =
  | "dashboard_view"
  | "tab_view";

export type DashboardAnalyticsTabId =
  | "today"
  | "home"
  | "weather"
  | "family"
  | "gothenburg"
  | "fun"
  | "resor"
  | "hemmet3d";

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
  try {
    const response = await fetch("/api/dashboard-analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, tabId }),
      keepalive: true,
    });
    if (!response.ok) console.error("Kunde inte spara dashboard-statistik:", response.status);
  } catch (error) {
    console.error("Kunde inte spara dashboard-statistik:", error);
  }
}

export async function getDashboardAnalytics(
  days = 30
): Promise<DashboardAnalyticsEvent[]> {
  const response = await fetch(`/api/dashboard-analytics?days=${encodeURIComponent(days)}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Dashboard-statistiken kunde inte hämtas.");
  const result = (await response.json()) as { events: DashboardAnalyticsEvent[] };
  return result.events ?? [];
}
