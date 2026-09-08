import {
  AlertTriangle,
  CloudRain,
  CloudSun,
  Droplets,
  Gauge,
  Sunrise,
  Sunset,
  Wind,
} from "lucide-react";

import Card from "@/components/ui/Card";
import WeatherIcon from "@/components/weather/WeatherIcon";
import {
  formatWeatherTime,
  getWeatherDescription,
  type WeatherData,
} from "@/lib/weather";
import {
  getWeather,
} from "@/lib/weather-server";

function formatHour(dateString: string): string {
  return new Date(dateString).toLocaleTimeString(
    "sv-SE",
    {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Stockholm",
    }
  );
}

function getTodayHourlyForecast(
  weather: WeatherData
) {
  const now = Date.now();

  const future = weather.hourly.time
    .map((time, index) => ({
      time,
      index,
      timestamp: new Date(time).getTime(),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.timestamp) &&
        item.timestamp >= now - 30 * 60 * 1000
    );

  if (future.length === 0) {
    return [];
  }

  // Visa sex punkter från nu och framåt, ungefär varannan timme.
  const result = [];
  for (
    let i = 0;
    i < future.length && result.length < 6;
    i += 2
  ) {
    result.push(future[i]);
  }

  return result;
}

function getUvLabel(uv: number): string {
  if (uv < 3) return "Lågt";
  if (uv < 6) return "Måttligt";
  if (uv < 8) return "Högt";
  if (uv < 11) return "Mycket högt";
  return "Extremt";
}

export default async function WeatherWidget() {
  let weather: WeatherData;

  try {
    weather = await getWeather();
  } catch (error) {
    console.error(
      "WeatherWidget kunde inte ladda väder:",
      error
    );

    return (
      <Card
        title="Väder"
        icon={<CloudSun size={28} />}
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
                  Väderkällorna svarade inte just nu.
                  Övriga delar av Väder-fliken kan fortfarande användas.
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

  const todayMax =
    weather.daily.temperatureMax[0];
  const todayMin =
    weather.daily.temperatureMin[0];
  const todayPrecipitation =
    weather.daily.precipitationSum[0] ?? 0;

  const hourlyForecast =
    getTodayHourlyForecast(weather);

  const details = [
    {
      label: "Luftfuktighet",
      value: `${Math.round(weather.humidity)} %`,
      subvalue: "Just nu",
      icon: Droplets,
    },
    {
      label: "UV-index",
      value: Math.round(weather.uvIndex).toString(),
      subvalue: getUvLabel(weather.uvIndex),
      icon: Gauge,
    },
    {
      label: "Soluppgång",
      value: formatWeatherTime(weather.sunrise),
      subvalue: "Idag",
      icon: Sunrise,
    },
    {
      label: "Solnedgång",
      value: formatWeatherTime(weather.sunset),
      subvalue: "Idag",
      icon: Sunset,
    },
  ];

  return (
    <Card
      title="Väder"
      icon={<CloudSun size={28} />}
      className="xl:col-span-2"
      storageKey="weather"
    >
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/[0.12] via-white/[0.04] to-slate-950/20 p-5 sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-200">
              {weather.location} · Idag
            </p>

            <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
              <p className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
                {Math.round(weather.temperature)}
                °C
              </p>

              <p className="pb-1 text-sm text-slate-400">
                Känns som{" "}
                <span className="font-semibold text-slate-200">
                  {Math.round(
                    weather.apparentTemperature
                  )}
                  °
                </span>
              </p>
            </div>

            <p className="mt-2 text-lg font-medium text-slate-200">
              {getWeatherDescription(
                weather.weatherCode
              )}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-slate-950/25 px-3 py-1.5 text-sm text-slate-300">
                <span className="font-semibold text-white">
                  {Math.round(todayMax)}°
                </span>{" "}
                max
              </span>

              <span className="rounded-full border border-white/10 bg-slate-950/25 px-3 py-1.5 text-sm text-slate-300">
                <span className="font-semibold text-white">
                  {Math.round(todayMin)}°
                </span>{" "}
                min
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/25 px-3 py-1.5 text-sm text-slate-300">
                <CloudRain
                  size={15}
                  className="text-blue-300"
                />
                <span className="font-semibold text-white">
                  {todayPrecipitation.toFixed(1)} mm
                </span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/25 px-3 py-1.5 text-sm text-slate-300">
                <Wind
                  size={15}
                  className="text-blue-300"
                />
                <span className="font-semibold text-white">
                  {Math.round(weather.windSpeed)} m/s
                </span>
              </span>
            </div>
          </div>

          <div className="flex h-28 w-28 shrink-0 items-center justify-center self-center rounded-3xl border border-white/10 bg-white/[0.06] shadow-lg shadow-black/10 sm:h-32 sm:w-32">
            <WeatherIcon
              code={weather.weatherCode}
              size={78}
            />
          </div>
        </div>
      </div>

      {hourlyForecast.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                Resten av dagen
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Temperatur och risk för nederbörd
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
            {hourlyForecast.map(
              ({ time, index }, position) => {
                const code =
                  weather.hourly.weatherCode[index];
                const precipitationProbability =
                  weather.hourly
                    .precipitationProbability[index] ?? 0;

                return (
                  <div
                    key={time}
                    className="flex min-w-0 flex-col items-center rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3 text-center transition hover:bg-white/[0.08]"
                  >
                    <p className="text-xs font-semibold text-slate-400">
                      {position === 0
                        ? "Nu"
                        : formatHour(time)}
                    </p>

                    <div className="my-2 flex h-10 items-center justify-center">
                      <WeatherIcon
                        code={code}
                        size={34}
                      />
                    </div>

                    <p className="text-lg font-bold text-white">
                      {Math.round(
                        weather.hourly.temperature[
                          index
                        ]
                      )}
                      °
                    </p>

                    <div className="mt-1 flex items-center gap-1 text-[11px] text-blue-300">
                      <Droplets size={11} />
                      <span>
                        {Math.round(
                          precipitationProbability
                        )}
                        %
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {details.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <div className="flex items-center gap-2 text-slate-400">
                <Icon
                  size={17}
                  className="text-blue-300"
                />
                <p className="text-xs font-medium sm:text-sm">
                  {item.label}
                </p>
              </div>

              <p className="mt-2 text-xl font-semibold text-white">
                {item.value}
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                {item.subvalue}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-7">
        <div className="mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
            7-dygnsprognos
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Högsta och lägsta temperatur
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {weather.daily.time.map(
            (day, index) => {
              const weatherCode =
                weather.daily.weatherCode[index];

              const date =
                new Date(
                  `${day}T12:00:00`
                ).toLocaleDateString(
                  "sv-SE",
                  {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    timeZone:
                      "Europe/Stockholm",
                  }
                );

              const precipitation =
                weather.daily
                  .precipitationSum[index] ?? 0;

              return (
                <div
                  key={day}
                  className={[
                    "flex flex-col rounded-2xl border p-3 transition duration-300 hover:-translate-y-1",
                    index === 0
                      ? "border-blue-400/25 bg-blue-400/[0.08]"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold capitalize text-white">
                      {index === 0
                        ? "Idag"
                        : date}
                    </p>

                    {precipitation > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-300">
                        <Droplets size={10} />
                        {precipitation.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div className="my-4 flex justify-center">
                    <WeatherIcon
                      code={weatherCode}
                      size={38}
                    />
                  </div>

                  <p className="min-h-8 text-center text-xs leading-4 text-slate-400">
                    {getWeatherDescription(
                      weatherCode
                    )}
                  </p>

                  <p className="mt-3 text-center text-lg font-bold text-white">
                    {Math.round(
                      weather.daily.temperatureMax[
                        index
                      ]
                    )}
                    °
                    <span className="font-normal text-slate-400">
                      {" "}
                      /{" "}
                      {Math.round(
                        weather.daily.temperatureMin[
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
