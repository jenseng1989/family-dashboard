import type { ReactNode } from "react";

import type {
  DynamicFamilyWidgetTemplate,
  WidgetGroup,
} from "@/config/widgets";

export type DashboardWidgetItem = {
  id: string;
  className: string;
  content: ReactNode;
};

type WidgetContentMap = Record<string, ReactNode>;

export function buildDashboardWidgets(
  group: WidgetGroup,
  contentMap: WidgetContentMap
): DashboardWidgetItem[] {
  return group.widgets
    .map((widget) => {
      const content =
        contentMap[widget.id];

      if (content === undefined) {
        console.warn(
          `Saknar dashboard-innehåll för widget "${widget.id}" i grupp "${group.key}".`
        );

        return null;
      }

      return {
        id: widget.id,
        className:
          widget.dashboardClassName ??
          "col-span-12 min-w-0",
        content,
      };
    })
    .filter(
      (
        item
      ): item is DashboardWidgetItem =>
        item !== null
    );
}

export function buildDynamicFamilyWidgets(
  templates: DynamicFamilyWidgetTemplate[],
  prefix: string,
  contentMap: WidgetContentMap
): DashboardWidgetItem[] {
  return templates
    .map((template) => {
      const content =
        contentMap[template.suffix];

      if (content === undefined) {
        console.warn(
          `Saknar familjeinnehåll för widget "${prefix}-${template.suffix}".`
        );

        return null;
      }

      return {
        id: `${prefix}-${template.suffix}`,
        className:
          template.dashboardClassName,
        content,
      };
    })
    .filter(
      (
        item
      ): item is DashboardWidgetItem =>
        item !== null
    );
}
