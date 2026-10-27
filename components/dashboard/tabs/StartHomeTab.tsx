"use client";

import Countdown from "@/components/dashboard/Countdown";
import GoogleCalendarWidget from "@/components/dashboard/GoogleCalendarWidget";
import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import VacationPlan from "@/components/dashboard/VacationPlan";
import WidgetGate from "@/components/dashboard/WidgetGate";
import { getWidgetGroup } from "@/config/widgets";
import { buildDashboardWidgets } from "@/lib/dashboard-widgets";

const startHomeConfig = getWidgetGroup("start-home");

const startHomeContentMap = {
  "google-calendar": <div id="dashboard-google-calendar" className="scroll-mt-6"><GoogleCalendarWidget /></div>,
  "vacation-plan": <VacationPlan />,
  countdown: <Countdown />,
};

export default function StartHomeTab() {
  return (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={WidgetGate}
      widgets={buildDashboardWidgets(
        startHomeConfig,
        startHomeContentMap
      )}
    />
  );
}
