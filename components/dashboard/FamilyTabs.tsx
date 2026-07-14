"use client";

import { ReactNode, useState } from "react";
import {
  Baby,
  Heart,
  User,
  Users,
} from "lucide-react";

type FamilyTabId =
  | "shared"
  | "jens"
  | "lenita"
  | "signe";

type FamilyTabsProps = {
  sharedContent: ReactNode;
  signeContent: ReactNode;
};

type FamilyTab = {
  id: FamilyTabId;
  label: string;
  icon: ReactNode;
};

const tabs: FamilyTab[] = [
  {
    id: "shared",
    label: "Gemensam",
    icon: <Users size={18} />,
  },
  {
    id: "jens",
    label: "Jens",
    icon: <User size={18} />,
  },
  {
    id: "lenita",
    label: "Lenita",
    icon: <Heart size={18} />,
  },
  {
    id: "signe",
    label: "Signe",
    icon: <Baby size={18} />,
  },
];

type EmptyPersonalPageProps = {
  name: string;
  description: string;
  icon: ReactNode;
};

function EmptyPersonalPage({
  name,
  description,
  icon,
}: EmptyPersonalPageProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-8">
      <div className="flex min-h-64 flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-blue-300">
          {icon}
        </div>

        <h2 className="mt-5 text-2xl font-bold text-white">
          {name}
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>
    </section>
  );
}

export default function FamilyTabs({
  sharedContent,
  signeContent,
}: FamilyTabsProps) {
  const [activeTab, setActiveTab] =
    useState<FamilyTabId>("shared");

  function getActiveContent(): ReactNode {
    switch (activeTab) {
      case "jens":
        return (
          <EmptyPersonalPage
            name="Jens"
            description="Här kan vi senare lägga till personliga uppgifter, viktiga datum, mål och anteckningar för Jens."
            icon={<User size={30} />}
          />
        );

      case "lenita":
        return (
          <EmptyPersonalPage
            name="Lenita"
            description="Här kan vi senare lägga till personliga uppgifter, viktiga datum, mål och anteckningar för Lenita."
            icon={<Heart size={30} />}
          />
        );

      case "signe":
        return signeContent;

      case "shared":
      default:
        return sharedContent;
    }
  }

  return (
    <div>
      <nav
        aria-label="Familjeflikar"
        className="mb-5 rounded-2xl border border-white/10 bg-white/[0.06] p-2 shadow-xl shadow-black/10 backdrop-blur-xl"
      >
        <div
          className="grid grid-cols-4 gap-2"
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 py-2",
                  "text-xs font-semibold transition duration-300 sm:text-sm",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                  isActive
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-950/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <span
                  className={
                    isActive
                      ? "text-white"
                      : "text-slate-400"
                  }
                >
                  {tab.icon}
                </span>

                <span className="hidden sm:inline">
                  {tab.label}
                </span>

                <span className="sm:hidden">
                  {tab.id === "shared"
                    ? "Gem."
                    : tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div
        key={activeTab}
        role="tabpanel"
        className="animate-[fadeIn_300ms_ease-out]"
      >
        {getActiveContent()}
      </div>
    </div>
  );
}