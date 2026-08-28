"use client";

import {
  ComponentType,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getWidgetSettings } from "@/lib/widget-settings";

export type OrderedWidget = {
  id: string;
  content: ReactNode;
  className?: string;
};

type OrderedWidgetGroupProps = {
  widgets: OrderedWidget[];
  wrapperClassName?: string;
  itemComponent?: ComponentType<{
    widgetId: string;
    className?: string;
    children: ReactNode;
  }>;
};

export default function OrderedWidgetGroup({
  widgets,
  wrapperClassName = "contents",
  itemComponent: ItemComponent,
}: OrderedWidgetGroupProps) {
  const widgetIdsKey = useMemo(
    () =>
      widgets
        .map((widget) => widget.id)
        .join("|"),
    [widgets]
  );

  const [orderedIds, setOrderedIds] =
    useState<string[]>(
      () =>
        widgets.map(
          (widget) => widget.id
        )
    );

  const loadOrder =
    useCallback(async () => {
      const widgetIds =
        widgetIdsKey.split("|");

      try {
        const settings =
          await getWidgetSettings();

        const orderMap =
          new Map(
            settings.map(
              (setting) => [
                setting.widgetId,
                setting.sortOrder,
              ]
            )
          );

        const sortedIds =
          [...widgetIds].sort(
            (firstId, secondId) =>
              (
                orderMap.get(firstId) ??
                Number.MAX_SAFE_INTEGER
              ) -
              (
                orderMap.get(secondId) ??
                Number.MAX_SAFE_INTEGER
              )
          );

        setOrderedIds(
          sortedIds
        );
      } catch (error) {
        console.error(
          "Kunde inte läsa widgetordningen:",
          error
        );

        setOrderedIds(
          widgetIds
        );
      }
    }, [widgetIdsKey]);

  useEffect(() => {
    void loadOrder();

    function handleChanged() {
      void loadOrder();
    }

    window.addEventListener(
      "widget-settings-changed",
      handleChanged
    );

    return () => {
      window.removeEventListener(
        "widget-settings-changed",
        handleChanged
      );
    };
  }, [loadOrder]);

  const widgetMap =
    new Map(
      widgets.map(
        (widget) => [
          widget.id,
          widget,
        ]
      )
    );

  return (
    <div className={wrapperClassName}>
      {orderedIds.map(
        (id) => {
          const widget =
            widgetMap.get(id);

          if (!widget) {
            return null;
          }

          if (ItemComponent) {
            return (
              <ItemComponent
                key={widget.id}
                widgetId={widget.id}
                className={widget.className}
              >
                {widget.content}
              </ItemComponent>
            );
          }

          return (
            <div
              key={widget.id}
              className={
                widget.className
              }
            >
              {widget.content}
            </div>
          );
        }
      )}
    </div>
  );
}
