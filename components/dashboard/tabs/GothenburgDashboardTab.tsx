import GothenburgDashboard from "@/components/dashboard/GothenburgDashboard";
import WidgetGate from "@/components/dashboard/WidgetGate";

export default function GothenburgDashboardTab() {
  return (
    <WidgetGate widgetId="gothenburg">
      <GothenburgDashboard />
    </WidgetGate>
  );
}
