import BathingWidget from "@/components/dashboard/BathingWidget";
import Countdown from "@/components/dashboard/Countdown";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import ElectricityWidget from "@/components/dashboard/ElectricityWidget";
import FamilyTimelineWidget from "@/components/dashboard/FamilyTimelineWidget";
import WeatherWidget from "@/components/dashboard/WeatherWidget";

export default function Dashboard() {
  const weatherContent = (
    <div className="grid gap-5 xl:grid-cols-3">
      <WeatherWidget />
      <BathingWidget />
    </div>
  );

  const electricityContent = (
    <div className="grid gap-5 xl:grid-cols-2">
      <ElectricityWidget />
    </div>
  );

  const familyContent = (
    <div className="grid gap-5">
      <Countdown />
      <FamilyTimelineWidget />
    </div>
  );

  return (
    <DashboardTabs
      weatherContent={weatherContent}
      electricityContent={electricityContent}
      familyContent={familyContent}
    />
  );
}