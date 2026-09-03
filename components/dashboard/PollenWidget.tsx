import {
  Flower2,
  Info,
  Leaf,
  MapPin,
} from "lucide-react";

import Card from "@/components/ui/Card";
import {
  getPollen,
  getPollenLevel,
  type PollenLevel,
} from "@/lib/pollen";

function getLevelClasses(
  level: PollenLevel
): string {
  switch (level) {
    case "Mycket hög":
      return "border-red-400/20 bg-red-400/10 text-red-200";

    case "Hög":
      return "border-orange-400/20 bg-orange-400/10 text-orange-200";

    case "Måttlig":
      return "border-amber-400/20 bg-amber-400/10 text-amber-200";

    case "Låg":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";

    case "Ingen":
    default:
      return "border-slate-400/15 bg-white/5 text-slate-300";
  }
}

function getBarWidth(
  value: number
): string {
  return `${
    Math.max(
      0,
      Math.min(
        100,
        value * 25
      )
    )
  }%`;
}

function formatForecastDate(
  dateString: string
): string {
  const [
    year,
    month,
    day,
  ] =
    dateString
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(
    "sv-SE",
    {
      weekday:
        "short",
      day:
        "numeric",
      month:
        "short",
    }
  );
}

export default async function PollenWidget() {
  let pollenData;

  try {
    pollenData =
      await getPollen();
  } catch (error) {
    console.error(
      "Kunde inte hämta pollen:",
      error
    );

    return (
      <Card
        title="Pollennivå"
        icon={
          <Flower2
            size={28}
          />
        }
      >
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
          <p className="font-semibold text-red-200">
            Pollendata kunde inte hämtas.
          </p>

          <p className="mt-1 text-sm text-red-100/70">
            Pollenrapportens API svarade inte just nu. Försök igen om en stund.
          </p>
        </div>
      </Card>
    );
  }

  const sortedPollen =
    [
      ...pollenData.pollen,
    ].sort(
      (
        first,
        second
      ) =>
        second.todayMax -
        first.todayMax
    );

  const highest =
    sortedPollen[0];

  return (
    <Card
      title="Pollennivå"
      icon={
        <Flower2
          size={28}
        />
      }
    >
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/10 via-white/[0.04] to-blue-400/10 p-5">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MapPin
              size={16}
            />

            <span>
              {
                pollenData.location
              }
            </span>
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Högst idag
          </p>

          {highest &&
          highest.todayMax >
            0 ? (
            <>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-4xl">
                  {
                    highest.emoji
                  }
                </span>

                <div>
                  <p className="text-2xl font-bold text-white">
                    {
                      highest.name
                    }
                  </p>

                  <p className="text-sm text-slate-400">
                    {
                      highest.level
                    }{" "}
                    nivå
                  </p>
                </div>
              </div>

              <div
                className={[
                  "mt-4 inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold",
                  getLevelClasses(
                    highest.level
                  ),
                ].join(
                  " "
                )}
              >
                {
                  highest.level
                }
              </div>
            </>
          ) : (
            <div className="mt-3">
              <p className="text-2xl font-bold text-white">
                Inga halter
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Prognosen visar inga halter för de valda pollentyperna idag.
              </p>
            </div>
          )}

          <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-slate-950/20 p-3">
            <Leaf
              size={17}
              className="mt-0.5 shrink-0 text-emerald-300"
            />

            <p className="text-xs leading-5 text-slate-400">
              Officiell pollenprognos för Göteborg från Pollenrapporten.
            </p>
          </div>
        </section>

        <section>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {sortedPollen.map(
              (pollen) => (
                <article
                  key={
                    pollen.id
                  }
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-2xl">
                        {
                          pollen.emoji
                        }
                      </span>

                      <p className="mt-2 font-semibold text-white">
                        {
                          pollen.name
                        }
                      </p>
                    </div>

                    <span
                      className={[
                        "rounded-full border px-2 py-1 text-[11px] font-semibold",
                        getLevelClasses(
                          pollen.level
                        ),
                      ].join(
                        " "
                      )}
                    >
                      {
                        pollen.level
                      }
                    </span>
                  </div>

                  <p className="mt-4 text-2xl font-bold text-white">
                    {
                      pollen.level
                    }
                  </p>

                  <p className="text-xs text-slate-500">
                    officiell prognosnivå
                  </p>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{
                        width:
                          getBarWidth(
                            pollen.todayMax
                          ),
                      }}
                    />
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      </div>

      {pollenData.forecastText && (
        <div className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
            Pollenrapportens prognos
          </p>

          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
            {
              pollenData.forecastText
            }
          </p>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
          Kommande dagar
        </h3>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pollenData.forecast.map(
            (day) => {
              const level =
                getPollenLevel(
                  day.highestValue
                );

              return (
                <article
                  key={
                    day.date
                  }
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="font-semibold capitalize text-white">
                    {formatForecastDate(
                      day.date
                    )}
                  </p>

                  {day.highestValue >
                  0 ? (
                    <>
                      <p className="mt-3 text-sm text-slate-400">
                        Högst:
                      </p>

                      <p className="mt-1 text-lg font-bold text-white">
                        {
                          day.highestName
                        }
                      </p>

                      <div
                        className={[
                          "mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                          getLevelClasses(
                            level
                          ),
                        ].join(
                          " "
                        )}
                      >
                        {
                          level
                        }
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">
                      Inga halter
                    </p>
                  )}
                </article>
              );
            }
          )}
        </div>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-2xl border border-blue-300/10 bg-blue-400/[0.06] p-4">
        <Info
          size={17}
          className="mt-0.5 shrink-0 text-blue-300"
        />

        <p className="text-xs leading-5 text-slate-400">
          Data: {pollenData.source}. Widgeten visar Pollenrapportens officiella prognosnivåer: inga, låga, måttliga, höga och mycket höga halter.
        </p>
      </div>
    </Card>
  );
}
