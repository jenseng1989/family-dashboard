"use client";

import {
  Activity,
  AppWindow,
  ArrowRight,
  MapPin,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";

const sections = [
  {
    title: "Familjen",
    description:
      "Familjemedlemmar, födelsedagar, namnsdagar och personliga inställningar.",
    icon: Users,
    accent:
      "border-pink-300/15 bg-pink-400/[0.06] text-pink-200",
    status: "Aktiv",
    href: "/admin/family",
  },
  {
    title: "Widgets",
    description:
      "Se dashboardens widgets, deras placering och nuvarande storlek.",
    icon: AppWindow,
    accent:
      "border-violet-300/15 bg-violet-400/[0.06] text-blue-300",
    status: "Aktiv",
    href: "/admin/widgets",
  },
  {
    title: "Göteborg",
    description:
      "Inställningar för Västtrafik, Luftkvalitet och framtida lokala funktioner.",
    icon: MapPin,
    accent:
      "border-blue-300/15 bg-blue-400/[0.06] text-blue-200",
    status: "Planerad",
    href: null,
  },
  {
    title: "Systemstatus",
    description:
      "Kontrollera att appens externa datakällor och API:er svarar som de ska.",
    icon: Activity,
    accent:
      "border-emerald-300/15 bg-emerald-400/[0.06] text-emerald-200",
    status: "Aktiv",
    href: "/admin/system-status",
  },
  {
    title: "Appinställningar",
    description:
      "Generella inställningar för Family Dashboard och hur appen beter sig.",
    icon: Settings,
    accent:
      "border-amber-300/15 bg-amber-400/[0.06] text-amber-200",
    status: "Aktiv",
    href: "/admin/app-settings",
  },
];

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-500 text-white">
                <Wrench size={28} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                  Kontrollrum
                </p>

                <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  Admin
                </h1>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Inställningar och administration för Family Dashboard.
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Till dashboarden
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;

            const content = (
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${section.accent}`}
                >
                  <Icon size={24} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-white">
                      {section.title}
                    </h2>

                    <ArrowRight
                      size={19}
                      className={
                        section.href
                          ? "mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-white"
                          : "mt-1 shrink-0 text-slate-400"
                      }
                    />
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {section.description}
                  </p>

                  <p
                    className={
                      section.href
                        ? "mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-400"
                        : "mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
                    }
                  >
                    {section.status}
                  </p>
                </div>
              </div>
            );

            return section.href ? (
              <Link
                key={section.title}
                href={section.href}
                className="group rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10"
              >
                {content}
              </Link>
            ) : (
              <article
                key={section.title}
                className="rounded-3xl border border-white/10 bg-white/10 p-5 opacity-80 shadow-2xl shadow-black/20 backdrop-blur-xl"
              >
                {content}
              </article>
            );
          })}
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-5">
          <p className="text-sm font-semibold text-white">
            Admin 1.4
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Familjen, Widgets, Systemstatus och Appinställningar
            är nu aktiva. Fler delar aktiveras stegvis.
          </p>
        </div>
      </div>
    </main>
  );
}