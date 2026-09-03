import AirQualityWidget from "@/components/dashboard/AirQualityWidget";
import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import PollenWidget from "@/components/dashboard/PollenWidget";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import WidgetGate from "@/components/dashboard/WidgetGate";
import { getWidgetGroup } from "@/config/widgets";
import { buildDashboardWidgets } from "@/lib/dashboard-widgets";

const weatherConfig = getWidgetGroup("weather");

const weatherContentMap = {
  weather: <WeatherWidget />,
  "gothenburg-air-quality": <AirQualityWidget />,
  pollen: <PollenWidget />,
};

export default function WeatherDashboardTab() {
  return (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={WidgetGate}
      widgets={buildDashboardWidgets(weatherConfig, weatherContentMap)}
    />
  );
}
