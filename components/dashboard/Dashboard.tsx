import WeatherAirQualityLazy from "@/components/dashboard/WeatherAirQualityLazy";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import EverydayOverview from "@/components/dashboard/EverydayOverview";
import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import PollenWidget from "@/components/dashboard/PollenWidget";
import StartTabs from "@/components/dashboard/StartTabs";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import WidgetGate from "@/components/dashboard/WidgetGate";
import {
  getWidgetGroup,
} from "@/config/widgets";
import {
  buildDashboardWidgets,
} from "@/lib/dashboard-widgets";

const startEverydayConfig =
  getWidgetGroup("start-everyday");

const weatherConfig =
  getWidgetGroup("weather");

const weatherContentMap = {
  weather: <WeatherWidget />,
  "gothenburg-air-quality": <WeatherAirQualityLazy />,
  pollen: <PollenWidget />,
};

export default function Dashboard() {
  const everydayWidget =
    startEverydayConfig.widgets[0];

  const weatherContent = (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={WidgetGate}
      widgets={buildDashboardWidgets(
        weatherConfig,
        weatherContentMap
      )}
    />
  );

  const startContent = (
    <div className="w-full min-w-0">
      <StartTabs
        everydayContent={
          everydayWidget ? (
            <WidgetGate
              widgetId={everydayWidget.id}
              className={
                everydayWidget.dashboardClassName
              }
            >
              <EverydayOverview />
            </WidgetGate>
          ) : null
        }
      />
    </div>
  );

  return (
    <div className="w-full min-w-0">
      <DashboardTabs
        startContent={startContent}
        weatherContent={weatherContent}
      />
    </div>
  );
}
