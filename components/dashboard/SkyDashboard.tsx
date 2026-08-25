import {
  Cloud,
  Sparkles,
} from "lucide-react";

export default function SkyDashboard() {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-sky-300/15 bg-gradient-to-br from-sky-500/[0.12] via-slate-950/80 to-blue-950/60 p-6 shadow-2xl shadow-black/10 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-300/15 bg-sky-400/10 text-sky-300">
            <Cloud size={29} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              Utforska
            </p>

            <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
              Himlen
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
              Här kan vi samla framtida funktioner och information som handlar
              om sådant som händer på himlen över Göteborg.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 text-center sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/15 bg-sky-400/10 text-sky-300">
          <Sparkles size={27} />
        </div>

        <h3 className="mt-4 text-xl font-bold text-white">
          Himlen är redo för nästa idé
        </h3>

        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Flygplansfunktionen är borttagen. Fliken är nu ren och kan byggas
          vidare på när vi hittar något som känns mer unikt och användbart.
        </p>
      </section>
    </div>
  );
}