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
  const widgets: DashboardWidgetItem[] = [];

  for (const widget of group.widgets) {
    const content =
      contentMap[widget.id];

    if (content === undefined) {
      console.warn(
        `Saknar dashboard-innehåll för widget "${widget.id}" i grupp "${group.key}".`
      );

      continue;
    }

    widgets.push({
      id: widget.id,
      className:
        widget.dashboardClassName ??
        "col-span-12 min-w-0",
      content,
    });
  }

  return widgets;
}

export function buildDynamicFamilyWidgets(
  templates: DynamicFamilyWidgetTemplate[],
  prefix: string,
  contentMap: WidgetContentMap
): DashboardWidgetItem[] {
  const widgets: DashboardWidgetItem[] = [];

  for (const template of templates) {
    const content =
      contentMap[template.suffix];

    if (content === undefined) {
      console.warn(
        `Saknar familjeinnehåll för widget "${prefix}-${template.suffix}".`
      );

      continue;
    }

    widgets.push({
      id: `${prefix}-${template.suffix}`,
      className:
        template.dashboardClassName ??
        "col-span-12 min-w-0",
      content,
    });
  }

  return widgets;
}
