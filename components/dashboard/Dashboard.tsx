import BathingWidget from "@/components/dashboard/BathingWidget";
import Countdown from "@/components/dashboard/Countdown";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import ElectricityWidget from "@/components/dashboard/ElectricityWidget";
import EverydayOverview from "@/components/dashboard/EverydayOverview";
import ExpensesWidget from "@/components/dashboard/ExpensesWidget";
import FamilyTabs from "@/components/dashboard/FamilyTabs";
import FamilyTimelineWidget from "@/components/dashboard/FamilyTimelineWidget";
import FunDashboard from "@/components/dashboard/FunDashboard";
import FunOtherDashboard from "@/components/dashboard/FunOtherDashboard";
import FunTabs from "@/components/dashboard/FunTabs";
import PersonalCenter from "@/components/dashboard/PersonalCenter";
import PollenWidget from "@/components/dashboard/PollenWidget";
import ShoppingList from "@/components/dashboard/ShoppingList";
import SigneOverview from "@/components/dashboard/SigneOverview";
import SigneGrowth from "@/components/dashboard/SigneGrowth";
import SigneTeeth from "@/components/dashboard/SigneTeeth";
import SigneVaccinations from "@/components/dashboard/SigneVaccinations";
import StartTabs from "@/components/dashboard/StartTabs";
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

      <div className="col-span-12 min-w-0">
        <PollenWidget />
      </div>
    </div>
  );

  const startHomeContent = (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <div className="col-span-12 min-w-0">
        <VacationPlan />
      </div>

      <div className="col-span-12 min-w-0">
        <Countdown />
      </div>

      <div className="col-span-12 min-w-0">
        <ElectricityWidget />
      </div>
    </div>
  );

  const shoppingContent = (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <div className="col-span-12 min-w-0 xl:col-span-6">
        <ShoppingList />
      </div>

      <div className="col-span-12 min-w-0 xl:col-span-6">
        <ExpensesWidget />
      </div>
    </div>
  );

  const startContent = (
    <div className="w-full min-w-0">
      <StartTabs
        everydayContent={<EverydayOverview />}
        homeContent={startHomeContent}
        shoppingContent={shoppingContent}
      />
    </div>
  );

  const sharedFamilyContent = (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
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
        <SigneOverview />
      </div>

      <div className="col-span-12 min-w-0">
        <SigneGrowth />
      </div>

      <div className="col-span-12 min-w-0">
        <SigneTeeth />
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
        startContent={startContent}
        weatherContent={weatherContent}
        familyContent={familyContent}
        funContent={funContent}
      />
    </div>
  );
}