import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SpaceWeatherLevel =
  | "Lugn"
  | "Förhöjd"
  | "Geomagnetisk storm"
  | "Kraftig storm"
  | "Mycket kraftig storm"
  | "Extrem storm";

type ParsedKpRow = {
  time: string | null;
  kp: number | null;
};

const OBSERVED_URL =
  "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";

const FORECAST_URL =
  "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";

function safeNumber(
  value: unknown
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value === "string") {
    const parsed =
      Number.parseFloat(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function getObjectString(
  object: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = object[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value;
    }
  }

  return null;
}

function getObjectNumber(
  object: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value =
      safeNumber(object[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function parseKpData(
  data: unknown
): ParsedKpRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  if (data.length === 0) {
    return [];
  }

  /*
   * NOAA använder normalt tabellformat:
   *
   * [
   *   ["time_tag", "Kp", ...],
   *   ["2026-...", "2.33", ...]
   * ]
   */
  if (
    Array.isArray(data[0])
  ) {
    const header =
      data[0].map((value) =>
        String(value)
      );

    const timeIndex =
      header.findIndex((value) =>
        [
          "time_tag",
          "time",
          "timestamp",
        ].includes(
          value.toLowerCase()
        )
      );

    const kpIndex =
      header.findIndex((value) =>
        [
          "kp",
          "kp_index",
          "estimated_kp",
          "predicted_kp",
        ].includes(
          value.toLowerCase()
        )
      );

    return data
      .slice(1)
      .filter(
        (
          row
        ): row is unknown[] =>
          Array.isArray(row)
      )
      .map((row) => ({
        time:
          timeIndex >= 0 &&
          typeof row[timeIndex] ===
            "string"
            ? row[timeIndex]
            : null,

        kp:
          kpIndex >= 0
            ? safeNumber(
                row[kpIndex]
              )
            : null,
      }))
      .filter(
        (row) =>
          row.kp !== null
      );
  }

  /*
   * Stöd även om NOAA skulle
   * returnera objektformat.
   */
  return data
    .filter(
      (
        row
      ): row is Record<
        string,
        unknown
      > =>
        typeof row === "object" &&
        row !== null &&
        !Array.isArray(row)
    )
    .map((row) => ({
      time: getObjectString(
        row,
        [
          "time_tag",
          "time",
          "timestamp",
        ]
      ),

      kp: getObjectNumber(
        row,
        [
          "Kp",
          "kp",
          "kp_index",
          "estimated_kp",
          "predicted_kp",
        ]
      ),
    }))
    .filter(
      (row) =>
        row.kp !== null
    );
}

function getLevel(
  kp: number
): SpaceWeatherLevel {
  if (kp < 4) {
    return "Lugn";
  }

  if (kp < 5) {
    return "Förhöjd";
  }

  if (kp < 6) {
    return "Geomagnetisk storm";
  }

  if (kp < 7) {
    return "Kraftig storm";
  }

  if (kp < 8) {
    return "Mycket kraftig storm";
  }

  return "Extrem storm";
}

function getStormScale(
  kp: number
): string {
  if (kp < 5) {
    return "Ingen G-storm";
  }

  if (kp < 6) {
    return "G1";
  }

  if (kp < 7) {
    return "G2";
  }

  if (kp < 8) {
    return "G3";
  }

  if (kp < 9) {
    return "G4";
  }

  return "G5";
}

function getAuroraInfo(
  kp: number
): {
  text: string;
  stars: number;
} {
  /*
   * Detta är medvetet en grov
   * indikator för Göteborg.
   *
   * Den bygger bara på Kp och
   * är inte en officiell NOAA-
   * prognos för Göteborg.
   */

  if (kp < 3) {
    return {
      text: "Mycket låg",
      stars: 1,
    };
  }

  if (kp < 4) {
    return {
      text: "Låg",
      stars: 2,
    };
  }

  if (kp < 5) {
    return {
      text: "Möjlig",
      stars: 3,
    };
  }

  if (kp < 6) {
    return {
      text: "Ganska bra",
      stars: 4,
    };
  }

  return {
    text: "Bra",
    stars: 5,
  };
}

function roundKp(
  value: number
): number {
  return (
    Math.round(value * 10) /
    10
  );
}

export async function GET() {
  try {
    const [
      observedResponse,
      forecastResponse,
    ] = await Promise.all([
      fetch(OBSERVED_URL, {
        headers: {
          Accept:
            "application/json",
          "User-Agent":
            "Family-Dashboard/1.0",
        },
        next: {
          revalidate: 300,
        },
      }),

      fetch(FORECAST_URL, {
        headers: {
          Accept:
            "application/json",
          "User-Agent":
            "Family-Dashboard/1.0",
        },
        next: {
          revalidate: 600,
        },
      }),
    ]);

    if (
      !observedResponse.ok
    ) {
      throw new Error(
        `NOAA Kp svarade med ${observedResponse.status}`
      );
    }

    const observedData:
      unknown =
      await observedResponse.json();

    const observedRows =
      parseKpData(
        observedData
      );

    if (
      observedRows.length ===
      0
    ) {
      throw new Error(
        "NOAA:s aktuella Kp-data kunde inte tolkas."
      );
    }

    const latest =
      observedRows[
        observedRows.length - 1
      ];

    const currentKp =
      latest.kp ?? 0;

    /*
     * NOAA-produkten innehåller
     * normalt ungefär det senaste
     * dygnet.
     */
    const maximumObserved =
      Math.max(
        ...observedRows.map(
          (row) =>
            row.kp ?? 0
        )
      );

    let forecastRows:
      ParsedKpRow[] = [];

    if (
      forecastResponse.ok
    ) {
      try {
        const forecastData:
          unknown =
          await forecastResponse.json();

        forecastRows =
          parseKpData(
            forecastData
          );
      } catch (error) {
        console.warn(
          "Kunde inte tolka NOAA:s Kp-prognos:",
          error
        );
      }
    }

    const now =
      Date.now();

    const futureForecast =
      forecastRows.filter(
        (row) => {
          if (!row.time) {
            return true;
          }

          const timestamp =
            new Date(
              row.time
            ).getTime();

          return (
            Number.isFinite(
              timestamp
            ) &&
            timestamp >= now
          );
        }
      );

    const forecastValues =
      futureForecast
        .map(
          (row) =>
            row.kp
        )
        .filter(
          (
            value
          ): value is number =>
            value !== null
        );

    const maximumForecast =
      forecastValues.length >
      0
        ? Math.max(
            ...forecastValues
          )
        : null;

    const nextForecast =
      futureForecast.find(
        (row) =>
          row.kp !== null
      );

    const aurora =
      getAuroraInfo(
        currentKp
      );

    return NextResponse.json(
      {
        kpIndex:
          roundKp(
            currentKp
          ),

        maxKp24h:
          roundKp(
            maximumObserved
          ),

        forecastKp:
          nextForecast?.kp !==
          null &&
          nextForecast?.kp !==
          undefined
            ? roundKp(
                nextForecast.kp
              )
            : null,

        maxForecastKp:
          maximumForecast !==
          null
            ? roundKp(
                maximumForecast
              )
            : null,

        level:
          getLevel(
            currentKp
          ),

        stormScale:
          getStormScale(
            currentKp
          ),

        auroraChance:
          aurora.text,

        auroraStars:
          aurora.stars,

        updatedAt:
          latest.time ??
          new Date().toISOString(),

        source: "NOAA SWPC",
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error(
      "Kunde inte hämta NOAA Space Weather:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Rymdväderdata kunde inte hämtas.",
      },
      {
        status: 500,
      }
    );
  }
}