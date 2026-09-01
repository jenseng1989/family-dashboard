"use client";

import { useEffect, useState } from "react";

type AppSettingsResponse = {
  settings?: {
    dashboardName?: string;
  };
};

const DEFAULT_DASHBOARD_NAME = "Family Dashboard";

export default function Header() {
  const [dashboardName, setDashboardName] = useState(
    DEFAULT_DASHBOARD_NAME
  );

  const date = new Date().toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardName() {
      try {
        const response = await fetch(
          "/api/admin/app-settings",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `API-fel ${response.status}`
          );
        }

        const result =
          (await response.json()) as AppSettingsResponse;

        const name =
          result.settings?.dashboardName?.trim();

        if (!cancelled && name) {
          setDashboardName(name);
        }
      } catch (error) {
        console.error(
          "Kunde inte läsa dashboardnamnet:",
          error
        );

        if (!cancelled) {
          setDashboardName(
            DEFAULT_DASHBOARD_NAME
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