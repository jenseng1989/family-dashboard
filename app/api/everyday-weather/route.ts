import { NextResponse } from "next/server";
import {
  getWeatherDescription,
} from "@/lib/weather";
import {
  getWeather,
} from "@/lib/weather-server";

export const dynamic = "force-dynamic";

type OutdoorHour = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  windSpeed: number;
  weatherCode: number;
};

function scoreOutdoorHour(
  hour: OutdoorHour
): number {
  let score = 100;

  score -= Math.min(
    70,
    hour.precipitationProbability * 0.7
  );

  if (hour.temperature < 5) {
    score -=
      (5 - hour.temperature) * 4;
  } else if (
    hour.temperature < 10
  ) {
    score -=
      (10 - hour.temperature) * 2;
  } else if (
    hour.temperature > 26
  ) {
    score -=
      (hour.temperature - 26) * 3;
  }

  if (hour.windSpeed > 7) {
    score -=
      (hour.windSpeed - 7) * 4;
  }

  if (
    [95, 96, 99].includes(
      hour.weatherCode
    )
  ) {
    score -= 50;
  }

  if (
    [65, 67, 75, 82, 86].includes(
      hour.weatherCode
    )
  ) {
    score -= 30;
  }

  return score;
}

function getOutdoorReason(
  hours: OutdoorHour[]
): string {
  const averageRain =
    hours.reduce(
      (sum, hour) =>
        sum +
        hour.precipitationProbability,
      0
    ) / hours.length;

  const averageWind =
    hours.reduce(
      (sum, hour) =>
        sum + hour.windSpeed,
      0
    ) / hours.length;

  const averageTemperature =
    hours.reduce(
      (sum, hour) =>
        sum + hour.temperature,
      0
    ) / hours.length;

  const parts: string[] = [];

  if (averageRain <= 20) {
    parts.push("låg regnrisk");
  } else if (
    averageRain <= 40
  ) {
    parts.push(
      "relativt låg regnrisk"
    );
  } else {
    parts.push(
      "viss risk för regn"
    );
  }

  if (averageWind <= 5) {
    parts.push("svag vind");
  } else if (
    averageWind <= 8
  ) {
    parts.push("måttlig vind");
  }

  if (
    averageTemperature >= 12 &&
    averageTemperature <= 24
  ) {
    parts.push(
      "behaglig temperatur"
    );
  }

  if (parts.length === 0) {
    return "Det här är dagens mest gynnsamma period utifrån vädret.";
  }

  return (
    parts
      .slice(0, -1)
      .join(", ") +
    (parts.length > 1
      ? ` och ${
          parts[
            parts.length - 1
          ]
        }`
      : parts[0]) +
    "."
  );
}

function findBestOutdoorWindow(
  hours: OutdoorHour[]
) {
  if (hours.length === 0) {
    return null;
  }

  const windowLength =
    Math.min(
      3,
      hours.length
    );

  let bestStart = 0;
  let bestScore =
    Number.NEGATIVE_INFINITY;

  for (
    let index = 0;
    index <=
    hours.length -
      windowLength;
    index += 1
  ) {
    const window =
      hours.slice(
        index,
        index +
          windowLength
      );

    const score =
      window.reduce(
        (sum, hour) =>
          sum +
          scoreOutdoorHour(
            hour
          ),
        0
      ) / window.length;

    if (
      score >
      bestScore
    ) {
      bestScore =
        score;
      bestStart =
        index;
    }
  }

  const bestHours =
    hours.slice(
      bestStart,
      bestStart +
        windowLength
    );

  const start =
    new Date(
      bestHours[0].time
    );

  const end =
    new Date(
      bestHours[
        bestHours.length -
          1
      ].time
    );

  end.setHours(
    end.getHours() + 1
  );

  const formatHour = (
    value: Date
  ) =>
    value.toLocaleTimeString(
      "sv-SE",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  return {
    start:
      formatHour(
        start
      ),
    end:
      formatHour(
        end
      ),
    reason:
      getOutdoorReason(
        bestHours
      ),
    score:
      Math.round(
        Math.max(
          0,
          Math.min(
            100,
            bestScore
          )
        )
      ),
  };
}

export async function GET() {
  try {
    const weather =
      await getWeather();

    const today =
      weather.daily.time[0];

    const now =
      new Date();

    const currentHour =
      now.getHours();

    const todayHours:
      OutdoorHour[] =
      weather.hourly.time
        .map(
          (
            time,
            index
          ) => ({
            time,
            temperature:
              weather
                .hourly
                .temperature[
                index
              ],
            apparentTemperature:
              weather
                .hourly
                .apparentTemperature[
                index
              ],
            precipitationProbability:
              weather
                .hourly
                .precipitationProbability[
                index
              ] ?? 0,
            weatherCode:
              weather
                .hourly
                .weatherCode[
                index
              ],
            windSpeed:
              weather
                .hourly
                .windSpeed[
                index
              ],
          })
        )
        .filter(
          (hour) => {
            const date =
              new Date(
                hour.time
              );

            const dateString =
              `${date.getFullYear()}-${String(
                date.getMonth() +
                  1
              ).padStart(
                2,
                "0"
              )}-${String(
                date.getDate()
              ).padStart(
                2,
                "0"
              )}`;

            return (
              dateString ===
                today &&
              date.getHours() >=
                Math.max(
                  7,
                  currentHour
                ) &&
              date.getHours() <=
                21
            );
          }
        );

    const outdoor =
      findBestOutdoorWindow(
        todayHours
      );

    const maxRainProbability =
      todayHours.length > 0
        ? Math.max(
            ...todayHours.map(
              (hour) =>
                hour.precipitationProbability
            )
          )
        : 0;

    return NextResponse.json(
      {
        location:
          weather.location,
        temperature:
          weather.temperature,
        apparentTemperature:
          weather.apparentTemperature,
        weatherCode:
          weather.weatherCode,
        description:
          getWeatherDescription(
            weather.weatherCode
          ),
        temperatureMax:
          weather.daily
            .temperatureMax[0],
        temperatureMin:
          weather.daily
            .temperatureMin[0],
        precipitationSum:
          weather.daily
            .precipitationSum[0] ??
          0,
        precipitationProbability:
          maxRainProbability,
        windSpeed:
          weather.windSpeed,
        uvIndex:
          weather.uvIndex,
        outdoor,
        updatedAt:
          new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=900, stale-while-revalidate=900",
        },
      }
    );
  } catch (error) {
    console.error(
      "Kunde inte hämta vardagsväder:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Väderdata kunde inte hämtas.",
      },
      {
        status: 500,
      }
    );
  }
}
