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
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <div className="col-span-12 min-w-0 xl:col-span-6">
        <WeatherWidget />
      </div>

      <div className="col-span-12 min-w-0 xl:col-span-6">
        <BathingWidget />
      </div>
    </div>
  );

  const electricityContent = (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <div className="col-span-12 min-w-0 xl:col-span-6">
        <ShoppingList />
      </div>

      <div className="col-span-12 min-w-0 xl:col-span-6">
        <Countdown />
      </div>

      <div className="col-span-12 min-w-0">
        <ElectricityWidget />
      </div>
    </div>
  );

  const sharedFamilyContent = (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <div className="col-span-12 min-w-0">
        <VacationPlan />
      </div>

      <div className="col-span-12 min-w-0">
        <FamilyTimelineWidget />
      </div>
    </div>
  );

  const jensContent = (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <div className="col-span-12 min-w-0">
        <PersonalCenter
          owner="jens"
          displayName="Jens"
        />
      </div>
    </div>
  );

  const lenitaContent = (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <div className="col-span-12 min-w-0">
        <PersonalCenter
          owner="lenita"
          displayName="Lenita"
        />
      </div>
    </div>
  );

const signeContent = (
  <div className="grid w-full min-w-0 grid-cols-12 gap-5">
    <div className="col-span-12 min-w-0">
      <SigneGrowth />
    </div>

    <div className="col-span-12 min-w-0">
      <SigneVaccinations />
    </div>
  </div>
);

  const familyContent = (
    <div className="w-full min-w-0">
      <FamilyTabs
        sharedContent={sharedFamilyContent}
        jensContent={jensContent}
        lenitaContent={lenitaContent}
        signeContent={signeContent}
      />
    </div>
  );

  const funContent = (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <div className="col-span-12 min-w-0">
        <FunTabs
          spaceContent={<FunDashboard />}
          otherContent={<FunOtherDashboard />}
        />
      </div>
    </div>
  );

  return (
    <div className="w-full min-w-0">
      <DashboardTabs
        weatherContent={weatherContent}
        electricityContent={electricityContent}
        familyContent={familyContent}
        funContent={funContent}
      />
    </div>
  );
}