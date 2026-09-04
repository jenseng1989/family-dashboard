"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_APP_SETTINGS,
  getAppSettings,
} from "@/lib/app-settings-client";

export default function Header() {
  const [dashboardName, setDashboardName] =
    useState(
      DEFAULT_APP_SETTINGS.dashboardName
    );

  const date = new Date().toLocaleDateString(
    "sv-SE",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardName() {
      try {
        const settings =
          await getAppSettings();

        if (!cancelled) {
          setDashboardName(
            settings.dashboardName
          );
        }
      } catch (error) {
        console.error(
          "Kunde inte läsa dashboardnamnet:",
          error
        );

        if (!cancelled) {
          setDashboardName(
            DEFAULT_APP_SETTINGS.dashboardName
          );
        }
      }
    }

    void loadDashboardName();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="mb-8">
      <div className="min-w-0">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-blue-300">
          Home control
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {dashboardName}
        </h1>

        <p className="mt-2 capitalize text-slate-300">
          {date}
        </p>
      </div>
    </header>
  );
}
