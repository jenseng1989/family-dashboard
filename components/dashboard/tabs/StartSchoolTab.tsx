"use client";

import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import SchoolCalendarWidget from "@/components/dashboard/SchoolCalendarWidget";
import SchoolLunchWidget from "@/components/dashboard/SchoolLunchWidget";
import WidgetGate from "@/components/dashboard/WidgetGate";
import { getWidgetGroup } from "@/config/widgets";
import { buildDashboardWidgets } from "@/lib/dashboard-widgets";

const schoolConfig = getWidgetGroup("start-school");

const schoolContentMap = {
  "school-schedule": <SchoolCalendarWidget />,
  "school-lunch": <SchoolLunchWidget />,
};

export default function StartSchoolTab() {
  return (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={WidgetGate}
      widgets={buildDashboardWidgets(schoolConfig, schoolContentMap)}
    />
  );
}
