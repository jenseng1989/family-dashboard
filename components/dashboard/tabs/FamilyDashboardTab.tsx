import DynamicFamilySection from "@/components/dashboard/DynamicFamilySection";
import FamilyTimelineWidget from "@/components/dashboard/FamilyTimelineWidget";
import WidgetGate from "@/components/dashboard/WidgetGate";
import { getWidgetGroup } from "@/config/widgets";

const sharedFamilyConfig = getWidgetGroup("family-shared");

export default function FamilyDashboardTab() {
  const familyTimelineWidget = sharedFamilyConfig.widgets[0];

  const sharedFamilyContent = (
    <div className="grid w-full min-w-0 grid-cols-12 gap-5">
      {familyTimelineWidget ? (
        <WidgetGate
          widgetId={familyTimelineWidget.id}
          className={familyTimelineWidget.dashboardClassName}
        >
          <FamilyTimelineWidget />
        </WidgetGate>
      ) : null}
    </div>
  );

  return (
    <div className="w-full min-w-0">
      <DynamicFamilySection sharedContent={sharedFamilyContent} />
    </div>
  );
}
