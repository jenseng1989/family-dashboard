"use client";

import {
  ComponentType,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getWidgetSettings,
  type WidgetSize,
} from "@/lib/widget-settings";

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

function getDefaultSize(
  className?: string
): WidgetSize {
  if (
    className?.includes(
      "xl:col-span-6"
    )
  ) {
    return "half";
  }

  return "full";
}

function getSizedClassName(
  className: string | undefined,
  size: WidgetSize
): string {
  const baseClassName =
    (
      className ??
      "col-span-12 min-w-0"
    )
      .replace(
        /\s*xl:col-span-\d+/g,
        ""
      )
      .trim();

  const sizeClassName =
    size === "half"
      ? "xl:col-span-6"
      : "xl:col-span-12";

  return [
    baseClassName,
    sizeClassName,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function OrderedWidgetGroup({
  widgets,
  wrapperClassName = "contents",
  itemComponent: ItemComponent,
}: OrderedWidgetGroupProps) {
  const widgetIdsKey = useMemo(
    () =>
      widgets
        .map(
          (widget) => widget.id
        )
        .join("|"),
    [widgets]
  );

  const [
    orderedIds,
    setOrderedIds,
  ] =
    useState<string[]>(
      () =>
        widgets.map(
          (widget) => widget.id
        )
    );

  const [
    sizes,
    setSizes,
  ] =
    useState<
      Record<
        string,
        WidgetSize
      >
    >({});

  const loadSettings =
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

        const sizeMap =
          new Map(
            settings.map(
              (setting) => [
                setting.widgetId,
                setting.size,
              ]
            )
          );

        const sortedIds =
          [...widgetIds].sort(
            (
              firstId,
              secondId
            ) =>
              (
                orderMap.get(
                  firstId
                ) ??
                Number.MAX_SAFE_INTEGER
              ) -
              (
                orderMap.get(
                  secondId
                ) ??
                Number.MAX_SAFE_INTEGER
              )
          );

        const nextSizes:
          Record<
            string,
            WidgetSize
          > = {};

        for (
          const widget
          of widgets
        ) {
          nextSizes[
            widget.id
          ] =
            sizeMap.get(
              widget.id
            ) ??
            getDefaultSize(
              widget.className
            );
        }

        setOrderedIds(
          sortedIds
        );

        setSizes(
          nextSizes
        );
      } catch (error) {
        console.error(
          "Kunde inte läsa widgetinställningarna:",
          error
        );

        setOrderedIds(
          widgetIds
        );

        const fallbackSizes:
          Record<
            string,
            WidgetSize
          > = {};

        for (
          const widget
          of widgets
        ) {
          fallbackSizes[
            widget.id
          ] =
            getDefaultSize(
              widget.className
            );
        }

        setSizes(
          fallbackSizes
        );
      }
    }, [
      widgetIdsKey,
      widgets,
    ]);

  useEffect(() => {
    void loadSettings();

    function handleChanged() {
      void loadSettings();
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
  }, [loadSettings]);

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
    <div
      className={
        wrapperClassName
      }
    >
      {orderedIds.map(
        (id) => {
          const widget =
            widgetMap.get(
              id
            );

          if (!widget) {
            return null;
          }

          const widgetSize =
            sizes[
              widget.id
            ] ??
            getDefaultSize(
              widget.className
            );

          const sizedClassName =
            getSizedClassName(
              widget.className,
              widgetSize
            );

          if (
            ItemComponent
          ) {
            return (
              <ItemComponent
                key={
                  widget.id
                }
                widgetId={
                  widget.id
                }
                className={
                  sizedClassName
                }
              >
                {
                  widget.content
                }
              </ItemComponent>
            );
          }

          return (
            <div
              key={
                widget.id
              }
              className={
                sizedClassName
              }
            >
              {
                widget.content
              }
            </div>
          );
        }
      )}
    </div>
  );
}
