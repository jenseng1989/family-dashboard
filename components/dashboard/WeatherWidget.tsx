import {
  AlertTriangle,
  CloudSun,
} from "lucide-react";

import Card from "@/components/ui/Card";
import WeatherIcon from "@/components/weather/WeatherIcon";
import {
  formatWeatherTime,
  getWeatherDescription,
} from "@/lib/weather";
import {
  getWeather,
} from "@/lib/weather-server";

export default async function WeatherWidget() {
  let weather;

  try {
    weather =
      await getWeather();
  } catch (error) {
    console.error(
      "WeatherWidget kunde inte ladda väder:",
      error
    );

    return (
      <Card
        title="Väder"
        icon={
          <CloudSun
            size={28}
          />
        }
        className="xl:col-span-2"
        storageKey="weather"
      >
        <div className="flex min-h-52 items-center justify-center">
          <div className="w-full rounded-2xl border border-amber-300/20 bg-amber-400/[0.07] p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={22}
                className="mt-0.5 shrink-0 text-amber-300"
              />

              <div>
                <p className="font-semibold text-white">
                  Vädret kunde inte hämtas
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Open-Meteo svarade inte just nu. Övriga delar av Väder-fliken kan fortfarande användas.
                </p>

                <p className="mt-3 text-xs text-slate-500">
                  Försök öppna fliken igen om en stund.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const details = [
    {
      label:
        "Luftfuktighet",
      value:
        `${Math.round(
          weather.humidity
        )} %`,
      icon: "💧",
    },
    {
      label: "UV-index",
      value:
        Math.round(
          weather.uvIndex
        ).toString(),
      icon: "☀️",
    },
    {
      label: "Soluppgång",
      value:
        formatWeatherTime(
          weather.sunrise
        ),
      icon: "🌅",
    },
    {
      label: "Solnedgång",
      value:
        formatWeatherTime(
          weather.sunset
        ),
      icon: "🌇",
    },
    {
      label: "Nederbörd",
      value:
        `${weather.precipitation.toFixed(
          1
        )} mm`,
      icon: "🌧",
    },
    {
      label: "Vind",
      value:
        `${Math.round(
          weather.windSpeed
        )} m/s`,
      icon: "🌬",
    },
  ];

  return (
    <Card
      title="Väder"
      icon={
        <CloudSun
          size={28}
        />
      }
      className="xl:col-span-2"
      storageKey="weather"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-5xl font-bold text-white">
            {Math.round(
              weather.temperature
            )}
            °C
          </p>

          <p className="mt-2 text-slate-300">
            {weather.location} ·{" "}
            {getWeatherDescription(
              weather.weatherCode
            )}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Känns som{" "}
            {Math.round(
              weather.apparentTemperature
            )}
            °C
          </p>
        </div>

        <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-lg shadow-black/10">
          <WeatherIcon
            code={
              weather.weatherCode
            }
            size={72}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {details.map(
          (item) => (
            <div
              key={
                item.label
              }
              className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
            >
              <p className="text-sm text-slate-400">
                <span className="mr-2">
                  {
                    item.icon
                  }
                </span>
                {
                  item.label
                }
              </p>

              <p className="mt-2 text-xl font-semibold text-white">
                {
                  item.value
                }
              </p>
            </div>
          )
        )}
      </div>

      <div className="mt-7">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
          7-dygnsprognos
        </h3>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {weather.daily.time.map(
            (
              day,
              index
            ) => {
              const weatherCode =
                weather.daily
                  .weatherCode[
                  index
                ];

              const date =
                new Date(
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

              return (
                <div
                  key={
                    day
                  }
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-3 transition duration-300 hover:-translate-y-1 hover:bg-white/10"
                >
                  <p className="font-semibold capitalize text-white">
                    {
                      date
                    }
                  </p>

                  <div className="my-4 flex justify-center">
                    <WeatherIcon
                      code={
                        weatherCode
                      }
                      size={38}
                    />
                  </div>

                  <p className="min-h-8 text-center text-xs text-slate-400">
                    {getWeatherDescription(
                      weatherCode
                    )}
                  </p>

                  <p className="mt-3 text-center text-lg font-bold text-white">
                    {Math.round(
                      weather.daily
                        .temperatureMax[
                        index
                      ]
                    )}
                    °
                    <span className="font-normal text-slate-400">
                      {" "}
                      /{" "}
                      {Math.round(
                        weather.daily
                          .temperatureMin[
                          index
                        ]
                      )}
                      °
                    </span>
                  </p>
                </div>
              );
            }
          )}
        </div>
      </div>
    </Card>
  );
}
