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
import GothenburgDashboard from "@/components/dashboard/GothenburgDashboard";
import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import PersonOverview from "@/components/dashboard/PersonOverview";
import PersonalCenter from "@/components/dashboard/PersonalCenter";
import PollenWidget from "@/components/dashboard/PollenWidget";
import ShoppingList from "@/components/dashboard/ShoppingList";
import SkyDashboard from "@/components/dashboard/SkyDashboard";
import SigneOverview from "@/components/dashboard/SigneOverview";
import SigneGrowth from "@/components/dashboard/SigneGrowth";
import SigneTeeth from "@/components/dashboard/SigneTeeth";
import SigneVaccinations from "@/components/dashboard/SigneVaccinations";
import StartTabs from "@/components/dashboard/StartTabs";
import VacationPlan from "@/components/dashboard/VacationPlan";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import WidgetGate from "@/components/dashboard/WidgetGate";

export default function Dashboard() {
  const weatherContent = (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={WidgetGate}
      widgets={[
        {
          id: "weather",
          className: "col-span-12 min-w-0 xl:col-span-6",
          content: <WeatherWidget />,
        },
        {
          id: "bathing",
          className: "col-span-12 min-w-0 xl:col-span-6",
          content: <BathingWidget />,
        },
        {
          id: "pollen",
          className: "col-span-12 min-w-0",
          content: <PollenWidget />,
        },
      ]}
    />
  );

  const startHomeContent = (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={WidgetGate}
      widgets={[
        {
          id: "vacation-plan",
          className: "col-span-12 min-w-0",
          content: <VacationPlan />,
        },
        {
          id: "countdown",
          className: "col-span-12 min-w-0",
          content: <Countdown />,
        },
        {
          id: "electricity",
          className: "col-span-12 min-w-0",
          content: <ElectricityWidget />,
        },
      ]}
    />
  );

  const shoppingContent = (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={WidgetGate}
      widgets={[
        {
          id: "shopping-list",
          className: "col-span-12 min-w-0 xl:col-span-6",
          content: <ShoppingList />,
        },
        {
          id: "expenses",
          className: "col-span-12 min-w-0 xl:col-span-6",
          content: <ExpensesWidget />,
        },
      ]}
    />
  );

  const startContent = (
    <div className="w-full min-w-0">
      <StartTabs
        everydayContent={
          <WidgetGate widgetId="everyday-overview">
            <EverydayOverview />
          </WidgetGate>
        }
        homeContent={startHomeContent}
        shoppingContent={shoppingContent}
      />
    </div>
  );

  const sharedFamilyContent = (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      <WidgetGate
        widgetId="family-timeline"
        className="col-span-12 min-w-0"
      >
        <FamilyTimelineWidget />
      </WidgetGate>
    </div>
  );

  const jensContent = (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={WidgetGate}
      widgets={[
        {
          id: "jens-overview",
          className: "col-span-12 min-w-0",
          content: (
            <PersonOverview
              displayName="Jens"
              fallbackEmoji="👨"
            />
          ),
        },
        {
          id: "jens-personal-center",
          className: "col-span-12 min-w-0",
          content: (
            <PersonalCenter
              owner="jens"
              displayName="Jens"
            />
          ),
        },
      ]}
    />
  );

  const lenitaContent = (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={WidgetGate}
      widgets={[
        {
          id: "lenita-overview",
          className: "col-span-12 min-w-0",
          content: (
            <PersonOverview
              displayName="Lenita"
              fallbackEmoji="👩"
            />
          ),
        },
        {
          id: "lenita-personal-center",
          className: "col-span-12 min-w-0",
          content: (
            <PersonalCenter
              owner="lenita"
              displayName="Lenita"
            />
          ),
        },
      ]}
    />
  );

  const signeContent = (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={WidgetGate}
      widgets={[
        {
          id: "signe-overview",
          className: "col-span-12 min-w-0",
          content: <SigneOverview />,
        },
        {
          id: "signe-growth",
          className: "col-span-12 min-w-0",
          content: <SigneGrowth section="growth" />,
        },
        {
          id: "signe-weight",
          className: "col-span-12 min-w-0",
          content: <SigneGrowth section="weight" />,
        },
        {
          id: "signe-height",
          className: "col-span-12 min-w-0",
          content: <SigneGrowth section="height" />,
        },
        {
          id: "signe-teeth",
          className: "col-span-12 min-w-0",
          content: <SigneTeeth />,
        },
        {
          id: "signe-vaccinations",
          className: "col-span-12 min-w-0",
          content: <SigneVaccinations />,
        },
        {
          id: "signe-history",
          className: "col-span-12 min-w-0",
          content: <SigneGrowth section="history" />,
        },
      ]}
    />
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
          spaceContent={
            <WidgetGate widgetId="fun-space">
              <FunDashboard />
            </WidgetGate>
          }
          otherContent={
            <WidgetGate widgetId="fun-other">
              <FunOtherDashboard />
            </WidgetGate>
          }
          skyContent={
            <WidgetGate widgetId="fun-sky">
              <SkyDashboard />
            </WidgetGate>
          }
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
        gothenburgContent={
          <WidgetGate widgetId="gothenburg">
            <GothenburgDashboard />
          </WidgetGate>
        }
        funContent={funContent}
      />
    </div>
  );
}
