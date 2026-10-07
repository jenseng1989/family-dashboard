import {
  AlertTriangle,
  CloudRain,
  CloudSun,
  Droplets,
  Gauge,
  Sunrise,
  Sunset,
  Sun,
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

function getNext24HoursForecast(
  weather: WeatherData
) {
  const now = new Date();
  const end = now.getTime() + 24 * 60 * 60 * 1000;

  return weather.hourly.time
    .map((time, index) => ({
      time,
      index,
      timestamp: new Date(time).getTime(),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.timestamp) &&
        item.timestamp > now.getTime() &&
        item.timestamp <= end
    )
    .slice(0, 24);
}


function getStockholmDateKey(value: string | Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(typeof value === "string" ? new Date(value) : value)
    .replace(/(\d{4})-(\d{2})-(\d{2})/, "$1-$2-$3");
}

function isRainCode(code: number): boolean {
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  );
}

function isSnowCode(code: number): boolean {
  return code === 68 || code === 69 || (code >= 71 && code <= 77) || code === 85 || code === 86;
}

function getWeatherHighlights(weather: WeatherData): Array<{
  label: string;
  text: string;
}> {
  const now = Date.now();
  const nextHours = weather.hourly.time
    .map((time, index) => ({
      time,
      timestamp: new Date(time).getTime(),
      temperature: weather.hourly.temperature[index],
      probability: weather.hourly.precipitationProbability[index] ?? 0,
      code: weather.hourly.weatherCode[index] ?? 0,
    }))
    .filter(
      (item) =>
        Number.isFinite(item.timestamp) &&
        item.timestamp > now &&
        item.timestamp <= now + 18 * 60 * 60 * 1000
    );

  const highlights: Array<{ label: string; text: string }> = [];

  if (nextHours.length > 0) {
    const first = nextHours[0];
    const rainingNow =
      isRainCode(weather.weatherCode) ||
      weather.precipitation > 0;

    if (rainingNow) {
      const firstDry = nextHours.find(
        (item) =>
          !isRainCode(item.code) &&
          item.probability < 40
      );

      highlights.push({
        label: "Regn",
        text: firstDry
          ? `Regnet väntas avta omkring ${formatHour(firstDry.time)}`
          : "Regn kan fortsätta under de närmaste timmarna",
      });
    } else {
      const firstRain = nextHours.find(
        (item) =>
          isRainCode(item.code) ||
          item.probability >= 60
      );

      highlights.push({
        label: "Regn",
        text: firstRain
          ? `Regn väntas omkring ${formatHour(firstRain.time)}`
          : "Inget tydligt regn väntas de närmaste 18 timmarna",
      });
    }

    const firstSnow = nextHours.find((item) => isSnowCode(item.code));
    const firstFrost = nextHours.find(
      (item) => item.temperature <= 0
    );

    if (firstSnow) {
      highlights.push({
        label: "Snö",
        text: `Snö kan förekomma omkring ${formatHour(firstSnow.time)}`,
      });
    } else if (firstFrost) {
      const today = getStockholmDateKey(new Date());
      const frostDay = getStockholmDateKey(firstFrost.time);

      highlights.push({
        label: "Frost",
        text:
          frostDay === today
            ? `Temperaturen kan nå 0° omkring ${formatHour(firstFrost.time)}`
            : `Risk för frost i natt omkring ${formatHour(firstFrost.time)}`,
      });
    }
  }

  return highlights;
}


function formatDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
}

function getDaylightInfo(sunrise: string, sunset: string) {
  const sunriseDate = new Date(sunrise);
  const sunsetDate = new Date(sunset);

  if (
    Number.isNaN(sunriseDate.getTime()) ||
    Number.isNaN(sunsetDate.getTime())
  ) {
    return null;
  }

  const totalMinutes =
    (sunsetDate.getTime() - sunriseDate.getTime()) / 60000;
  const now = new Date();

  return {
    totalMinutes,
    remainingMinutes:
      now < sunriseDate
        ? totalMinutes
        : now < sunsetDate
          ? (sunsetDate.getTime() - now.getTime()) / 60000
          : 0,
    isBeforeSunrise: now < sunriseDate,
    isAfterSunset: now >= sunsetDate,
  };
}


function getYesterdayComparison(
  currentTemperature: number,
  yesterdayTemperature: number | null
): string | null {
  if (
    yesterdayTemperature === null ||
    !Number.isFinite(
      yesterdayTemperature
    )
  ) {
    return null;
  }

  const difference =
    currentTemperature -
    yesterdayTemperature;

  if (Math.abs(difference) < 0.5) {
    return "Ungefär samma temperatur som igår vid samma tid";
  }

  const roundedDifference =
    Math.max(
      1,
      Math.round(
        Math.abs(difference)
      )
    );

  return `${roundedDifference}° ${
    difference > 0
      ? "varmare"
      : "kallare"
  } än igår vid samma tid`;
}

function getWindDirectionLabel(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const directions = [
    "N",
    "NO",
    "O",
    "SO",
    "S",
    "SV",
    "V",
    "NV",
  ];

  return directions[Math.round(normalized / 45) % 8];
}

function getUvLabel(uv: number): string {
  if (uv < 3) return "Lågt";
  if (uv < 6) return "Måttligt";
  if (uv < 8) return "Högt";
  if (uv < 11) return "Mycket högt";
  return "Extremt";
}

function TemperatureChart({
  points,
}: {
  points: Array<{
    time: string;
    temperature: number;
    apparentTemperature: number;
  }>;
}) {
  if (points.length < 2) {
    return null;
  }

  const width = 720;
  const height = 190;
  const paddingX = 24;
  const paddingTop = 30;
  const paddingBottom = 42;
  const values = points.flatMap((point) => [
    point.temperature,
    point.apparentTemperature,
  ]);
  const minTemperature = Math.min(...values);
  const maxTemperature = Math.max(...values);
  const range = Math.max(1, maxTemperature - minTemperature);

  const getY = (value: number) =>
    paddingTop +
    ((maxTemperature - value) / range) *
      (height - paddingTop - paddingBottom);

  const coordinates = points.map((point, index) => ({
    ...point,
    x:
      paddingX +
      (index / Math.max(1, points.length - 1)) *
        (width - paddingX * 2),
    temperatureY: getY(point.temperature),
    apparentY: getY(point.apparentTemperature),
  }));

  const temperaturePath = coordinates
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.temperatureY.toFixed(1)}`
    )
    .join(" ");

  const apparentPath = coordinates
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.apparentY.toFixed(1)}`
    )
    .join(" ");

  return (
    <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-48 min-w-[680px] w-full"
        role="img"
        aria-label="Temperatur och känns som för resten av dagen"
      >
        <path
          d={apparentPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-400"
        />

        <path
          d={temperaturePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-blue-300"
        />

        {coordinates.map((point, index) => (
          <g key={`${point.time}-${index}`}>
            <circle
              cx={point.x}
              cy={point.temperatureY}
              r="3.5"
              fill="currentColor"
              className="text-blue-200"
            />
            <circle
              cx={point.x}
              cy={point.apparentY}
              r="3"
              fill="currentColor"
              className="text-slate-300"
            />

            <text
              x={point.x}
              y={point.temperatureY - 12}
              textAnchor="middle"
              className="fill-white text-[12px] font-semibold"
            >
              {Math.round(point.temperature)}°
            </text>

            <text
              x={point.x}
              y={height - 12}
              textAnchor="middle"
              className="fill-slate-500 text-[11px]"
            >
              {formatHour(point.time)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
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
    getNext24HoursForecast(weather);

  const temperatureChartPoints =
    hourlyForecast.map(({ time, index }) => ({
      time,
      temperature: weather.hourly.temperature[index],
      apparentTemperature:
        weather.hourly.apparentTemperature[index],
    }));

  const weatherHighlights =
    getWeatherHighlights(weather);

  const yesterdayComparison =
    getYesterdayComparison(
      weather.temperature,
      weather.yesterdayTemperature
    );

  const daylightInfo =
    getDaylightInfo(weather.sunrise, weather.sunset);

  const details = [
    {
      label: "UV-index",
      value: Math.round(weather.uvIndex).toString(),
      subvalue: getUvLabel(weather.uvIndex),
      icon: Gauge,
    },
    {
      label: "Luftfuktighet",
      value: `${Math.round(weather.humidity)} %`,
      subvalue: "Just nu",
      icon: Droplets,
    },
    {
      label: "Nederbörd idag",
      value: `${todayPrecipitation.toFixed(1)} mm`,
      subvalue: "Totalt idag",
      icon: CloudRain,
    },
  ];

  return (
    <Card
      title="Väder"
      icon={<CloudSun size={28} />}
      className="xl:col-span-2"
      storageKey="weather"
    >
      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/[0.16] via-cyan-400/[0.06] to-slate-950/30 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-200">
                {weather.location} · Idag
              </p>

              <div className="mt-3 flex items-end gap-3">
                <p className="text-6xl font-bold tracking-[-0.06em] text-white sm:text-7xl">
                  {Math.round(weather.temperature)}°
                </p>
                <p className="pb-2 text-sm text-slate-400">
                  Känns som{" "}
                  <span className="font-semibold text-slate-200">
                    {Math.round(weather.apparentTemperature)}°
                  </span>
                </p>
              </div>

              <p className="mt-2 text-lg font-semibold text-slate-100 sm:text-xl">
                {getWeatherDescription(weather.weatherCode)}
              </p>

              <p className="mt-3 text-sm text-slate-300">
                Högsta{" "}
                <span className="font-semibold text-white">
                  {Math.round(todayMax)}°
                </span>
                {" · "}
                Lägsta{" "}
                <span className="font-semibold text-white">
                  {Math.round(todayMin)}°
                </span>
              </p>

              {weatherHighlights.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {weatherHighlights.map((highlight) => (
                    <p
                      key={highlight.label}
                      className="text-sm leading-5 text-slate-300"
                    >
                      <span className="font-semibold text-white">
                        {highlight.label}:
                      </span>{" "}
                      {highlight.text}
                    </p>
                  ))}
                </div>
              )}

              {yesterdayComparison && (
                <p className="mt-1.5 text-sm leading-5 text-slate-300">
                  <span className="font-semibold text-white">
                    Jämfört med igår:
                  </span>{" "}
                  {yesterdayComparison}
                </p>
              )}
            </div>

            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] shadow-lg shadow-black/10 sm:h-36 sm:w-36">
              <WeatherIcon code={weather.weatherCode} size={76} />
            </div>
          </div>
        </section>

        {hourlyForecast.length > 0 && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                Kommande 24 timmar
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Dra i sidled för fler timmar
              </p>
            </div>

            <div className="w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-2 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max min-w-full gap-2 sm:gap-3">
                {hourlyForecast.map(({ time, index }) => {
                  const code = weather.hourly.weatherCode[index];
                  const precipitationProbability =
                    weather.hourly.precipitationProbability[index] ?? 0;

                  return (
                    <div
                      key={time}
                      className="flex w-[calc((100vw-6rem-5*0.5rem)/6)] min-w-[72px] max-w-[140px] shrink-0 snap-start flex-col items-center rounded-2xl border border-white/10 bg-slate-950/20 px-2 py-3 text-center transition hover:bg-white/[0.08] sm:w-[calc((100vw-10rem-5*0.75rem)/6)] xl:w-[calc((100vw-26rem-5*0.75rem)/6)]"
                    >
                      <p className="text-xs font-semibold text-slate-400">
                        {formatHour(time)}
                      </p>

                      <div className="my-2 flex h-10 items-center justify-center">
                        <WeatherIcon code={code} size={34} />
                      </div>

                      <p className="text-lg font-bold text-white">
                        {Math.round(weather.hourly.temperature[index])}°
                      </p>

                      <div className="mt-1 flex items-center gap-1 text-[11px] text-blue-300">
                        <Droplets size={11} />
                        <span>{Math.round(precipitationProbability)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {temperatureChartPoints.length > 1 && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                  Temperaturkurva
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Kommande 24 timmar
                </p>
              </div>

              <div className="flex gap-2 text-xs">
                <span className="rounded-full border border-amber-200/15 bg-amber-200/[0.06] px-2.5 py-1 text-amber-100">
                  Högst {Math.round(Math.max(...temperatureChartPoints.map((point) => point.temperature)))}°
                </span>
                <span className="rounded-full border border-cyan-200/15 bg-cyan-200/[0.06] px-2.5 py-1 text-cyan-100">
                  Lägst {Math.round(Math.min(...temperatureChartPoints.map((point) => point.temperature)))}°
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-5 rounded-full bg-blue-300" />
                <span>Temperatur</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 border-t-2 border-dashed border-slate-400" />
                <span>Känns som</span>
              </div>
            </div>

            <div className="mt-2">
              <TemperatureChart points={temperatureChartPoints} />
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
          <div className="border-b border-white/10 px-4 py-4 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              7-dygnsprognos
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Dag för dag
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {weather.daily.time.map((day, index) => {
              const weatherCode = weather.daily.weatherCode[index];
              const precipitation =
                weather.daily.precipitationSum[index] ?? 0;
              const precipitationProbability = null;

              const date = new Date(`${day}T12:00:00`).toLocaleDateString(
                "sv-SE",
                {
                  weekday: "short",
                  timeZone: "Europe/Stockholm",
                }
              );

              return (
                <div
                  key={day}
                  className={[
                    "grid grid-cols-[64px_1fr_auto_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[90px_1fr_auto_auto] sm:px-5",
                    index === 0 ? "bg-blue-400/[0.07]" : "",
                  ].join(" ")}
                >
                  <div>
                    <p className="font-semibold capitalize text-white">
                      {index === 0 ? "Idag" : date}
                    </p>
                    {index === 0 && (
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-300">
                        Idag
                      </p>
                    )}
                  </div>

                  <div className="flex min-w-0 items-center gap-2">
                    <WeatherIcon code={weatherCode} size={30} />
                    <p className="hidden truncate text-xs text-slate-400 sm:block">
                      {getWeatherDescription(weatherCode)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-blue-300">
                    <Droplets size={12} />
                    <span>
                      {precipitationProbability !== null
                        ? `${Math.round(precipitationProbability)}%`
                        : `${precipitation.toFixed(1)} mm`}
                    </span>
                  </div>

                  <p className="min-w-[62px] text-right text-sm font-semibold text-white sm:text-base">
                    {Math.round(weather.daily.temperatureMax[index])}°
                    <span className="font-normal text-slate-500">
                      {" "}
                      {Math.round(weather.daily.temperatureMin[index])}°
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Wind size={18} className="text-blue-300" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              Vind
            </p>
          </div>

          <div className="mt-5 grid grid-cols-[112px_1fr] items-center gap-5 sm:grid-cols-[140px_1fr]">
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-slate-950/25 sm:h-32 sm:w-32">
              <span className="absolute top-2 text-[10px] font-semibold text-slate-500">
                N
              </span>
              <span className="absolute bottom-2 text-[10px] font-semibold text-slate-500">
                S
              </span>
              <span className="absolute left-2 text-[10px] font-semibold text-slate-500">
                V
              </span>
              <span className="absolute right-2 text-[10px] font-semibold text-slate-500">
                O
              </span>

              <div
                className="flex h-14 w-14 items-center justify-center rounded-full border border-blue-300/20 bg-blue-400/[0.08]"
                style={{
                  transform: `rotate(${weather.windDirection}deg)`,
                }}
              >
                <div className="text-3xl leading-none text-blue-200">↑</div>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-3xl font-bold text-white sm:text-4xl">
                {getWindDirectionLabel(weather.windDirection)}{" "}
                {Math.round(weather.windSpeed)}
                <span className="ml-1 text-base font-medium text-slate-400">
                  m/s
                </span>
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-3">
                  <p className="text-xs text-slate-500">Medelvind</p>
                  <p className="mt-1 font-semibold text-white">
                    {Math.round(weather.windSpeed)} m/s
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-3">
                  <p className="text-xs text-slate-500">Vindbyar</p>
                  <p className="mt-1 font-semibold text-white">
                    {Math.round(weather.windGusts)} m/s
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Vind från {getWindDirectionLabel(weather.windDirection)} ·{" "}
                {Math.round(weather.windDirection)}°
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {details.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="min-h-32 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5"
              >
                <div className="flex items-center gap-2 text-slate-400">
                  <Icon size={18} className="text-blue-300" />
                  <p className="text-xs font-medium sm:text-sm">
                    {item.label}
                  </p>
                </div>

                <p className="mt-5 text-2xl font-semibold text-white sm:text-3xl">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.subvalue}
                </p>
              </div>
            );
          })}
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-blue-400/[0.08] to-white/[0.025] p-5">
          <div className="flex items-center gap-2">
            <Sun size={18} className="text-amber-200" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              Solen idag
            </p>
          </div>

          <div className="relative mx-auto mt-6 h-24 max-w-xl overflow-hidden">
            <div className="absolute left-[8%] right-[8%] top-16 h-24 rounded-[50%] border-t border-amber-200/40" />
            <div className="absolute left-[8%] right-[8%] top-16 border-t border-white/10" />
            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-amber-200/90 p-1.5 shadow-[0_0_28px_rgba(253,230,138,0.28)]">
              <Sun size={18} className="text-amber-950" />
            </div>
          </div>

          <div className="mt-1 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-400">
                <Sunrise size={16} className="text-amber-200" />
                <span className="text-xs">Soluppgång</span>
              </div>
              <p className="mt-1 text-lg font-semibold text-white">
                {formatWeatherTime(weather.sunrise)}
              </p>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-2 text-slate-400">
                <Sunset size={16} className="text-amber-200" />
                <span className="text-xs">Solnedgång</span>
              </div>
              <p className="mt-1 text-lg font-semibold text-white">
                {formatWeatherTime(weather.sunset)}
              </p>
            </div>
          </div>

          {daylightInfo && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/20 p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">Dagsljus idag</p>
                  <p className="mt-1 font-semibold text-white">
                    {formatDuration(daylightInfo.totalMinutes)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    {daylightInfo.isAfterSunset
                      ? "Solen har gått ner"
                      : daylightInfo.isBeforeSunrise
                        ? "Dagsljus efter soluppgång"
                        : "Dagsljus kvar"}
                  </p>
                  {!daylightInfo.isAfterSunset && (
                    <p className="mt-1 font-semibold text-white">
                      {formatDuration(daylightInfo.remainingMinutes)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}
