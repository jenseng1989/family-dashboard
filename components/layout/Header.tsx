import { CalendarDays } from "lucide-react";

export default function Header() {
  const date = new Date().toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-blue-300">
          Home control
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Family Dashboard
        </h1>

        <p className="mt-2 capitalize text-slate-300">{date}</p>
      </div>

      <div className="flex w-fit items-center gap-3 rounded-3xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-xl">
        <CalendarDays className="text-blue-300" size={28} />
        <div>
          <p className="text-sm text-slate-300">Status</p>
          <p className="font-semibold text-white">Online</p>
        </div>
      </div>
    </header>
  );
}