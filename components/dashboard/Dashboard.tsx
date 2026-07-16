import BathingWidget from "@/components/dashboard/BathingWidget";
import Countdown from "@/components/dashboard/Countdown";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import ElectricityWidget from "@/components/dashboard/ElectricityWidget";
import FamilyTabs from "@/components/dashboard/FamilyTabs";
import FamilyTimelineWidget from "@/components/dashboard/FamilyTimelineWidget";
import FunDashboard from "@/components/dashboard/FunDashboard";
import FunOtherDashboard from "@/components/dashboard/FunOtherDashboard";
import FunTabs from "@/components/dashboard/FunTabs";
import PersonalCenter from "@/components/dashboard/PersonalCenter";
import ShoppingList from "@/components/dashboard/ShoppingList";
import SigneGrowth from "@/components/dashboard/SigneGrowth";
import SigneVaccinations from "@/components/dashboard/SigneVaccinations";
import VacationPlan from "@/components/dashboard/VacationPlan";
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
      <VacationPlan />
      <FamilyTimelineWidget />
    </div>
  );

  const jensContent = (
    <PersonalCenter
      owner="jens"
      displayName="Jens"
    />
  );

  const lenitaContent = (
    <PersonalCenter
      owner="lenita"
      displayName="Lenita"
    />
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
      jensContent={jensContent}
      lenitaContent={lenitaContent}
      signeContent={signeContent}
    />
  );

  const funContent = (
    <FunTabs
      spaceContent={<FunDashboard />}
      otherContent={<FunOtherDashboard />}
    />
  );

  return (
    <DashboardTabs
      weatherContent={weatherContent}
      electricityContent={electricityContent}
      familyContent={familyContent}
      funContent={funContent}
    />
  );
}