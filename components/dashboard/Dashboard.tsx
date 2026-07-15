import BathingWidget from "@/components/dashboard/BathingWidget";
import Countdown from "@/components/dashboard/Countdown";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import ElectricityWidget from "@/components/dashboard/ElectricityWidget";
import FamilyTabs from "@/components/dashboard/FamilyTabs";
import FamilyTimelineWidget from "@/components/dashboard/FamilyTimelineWidget";
import ShoppingList from "@/components/dashboard/ShoppingList";
import SigneGrowth from "@/components/dashboard/SigneGrowth";
import SigneVaccinations from "@/components/dashboard/SigneVaccinations";
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
      <ShoppingList />
      <Countdown />
      <ElectricityWidget />
    </div>
  );

  const sharedFamilyContent = (
    <div className="grid gap-5">      
      <FamilyTimelineWidget />
    </div>
  );

  const signeContent = (
    <div className="grid gap-5">
      <SigneGrowth />
      <SigneVaccinations />
    </div>
  );

  const familyContent = (
    <FamilyTabs
      sharedContent={sharedFamilyContent}
      signeContent={signeContent}
    />
  );

  return (
    <DashboardTabs
      weatherContent={weatherContent}
      electricityContent={electricityContent}
      familyContent={familyContent}
    />
  );
}