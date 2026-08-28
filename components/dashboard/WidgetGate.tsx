"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { getWidgetSettings } from "@/lib/widget-settings";

type WidgetGateProps = {
  widgetId: string;
  className?: string;
  children: ReactNode;
};

export default function WidgetGate({
  widgetId,
  className,
  children,
}: WidgetGateProps) {
  const [
    isVisible,
    setIsVisible,
  ] = useState(true);

  const [
    hasLoaded,
    setHasLoaded,
  ] = useState(false);

  const loadVisibility =
    useCallback(async () => {
      try {
        const settings =
          await getWidgetSettings();

        const setting =
          settings.find(
            (item) =>
              item.widgetId ===
              widgetId
          );

        setIsVisible(
          setting?.isVisible ??
            true
        );
      } catch (error) {
        console.error(
          `Kunde inte läsa synlighet för widget "${widgetId}":`,
          error
        );

        // Dashboarden ska fortsätta fungera även om
        // widget_settings tillfälligt inte kan läsas.
        setIsVisible(true);
      } finally {
        setHasLoaded(true);
      }
    }, [widgetId]);

  useEffect(() => {
    void loadVisibility();

    function handleWidgetSettingsChanged() {
      void loadVisibility();
    }

    window.addEventListener(
      "widget-settings-changed",
      handleWidgetSettingsChanged
    );

    return () => {
      window.removeEventListener(
        "widget-settings-changed",
        handleWidgetSettingsChanged
      );
    };
  }, [loadVisibility]);

  // Innan inställningen är hämtad behåller vi widgeten synlig.
  // Det undviker att hela dashboarden blinkar tom vid laddning.
  if (
    hasLoaded &&
    !isVisible
  ) {
    return null;
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
}
