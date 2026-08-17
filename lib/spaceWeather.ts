export type SpaceWeatherLevel =
  | "Lugn"
  | "Förhöjd"
  | "Geomagnetisk storm"
  | "Kraftig storm"
  | "Mycket kraftig storm"
  | "Extrem storm";

export type SpaceWeatherData = {
  kpIndex: number;
  level: SpaceWeatherLevel;
  stormScale: string;
  auroraChance: string;
  auroraStars: number;
  updatedAt: string;
  forecastKp: number | null;
};

type KpRow = {
  time_tag?: string;
  kp_index?: number | string;
  estimated_kp?: number | string;
  Kp?: number | string;
};

type KpForecastRow = {
  time_tag?: string;
  kp?: number | string;
  kp_index?: number | string;
  predicted_kp?: number | string;
};

function safeNumber(
  value: number | string | undefined
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function getSpaceWeatherLevel(
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
  label: string;
  stars: number;
} {
  if (kp < 3) {
    return {
      label: "Mycket låg chans",
      stars: 1,
    };
  }

  if (kp < 4) {
    return {
      label: "Låg chans",
      stars: 2,
    };
  }

  if (kp < 5) {
    return {
      label: "Möjligt vid bra förhållanden",
      stars: 3,
    };
  }

  if (kp < 6) {
    return {
      label: "Ganska bra chans",
      stars: 4,
    };
  }

  return {
    label: "Bra chans",
    stars: 5,
  };
}

function findLatestKp(
  rows: KpRow[]
): {
  kp: number;
  time: string;
} | null {
  for (
    let index = rows.length - 1;
    index >= 0;
    index -= 1
  ) {
    const row = rows[index];

    const kp =
      safeNumber(row.kp_index) ??
      safeNumber(row.estimated_kp) ??
      safeNumber(row.Kp);

    if (kp === null) {
      continue;
    }

    return {
      kp,
      time:
        row.time_tag ??
        new Date().toISOString(),
    };
  }

  return null;
}

function findForecastKp(
  rows: KpForecastRow[]
): number | null {
  const now = Date.now();

  for (const row of rows) {
    const value =
      safeNumber(row.kp) ??
      safeNumber(row.kp_index) ??
      safeNumber(row.predicted_kp);

    if (value === null) {
      continue;
    }

    if (!row.time_tag) {
      return value;
    }

    const timestamp =
      new Date(
        row.time_tag
      ).getTime();

    if (
      Number.isFinite(timestamp) &&
      timestamp >= now
    ) {
      return value;
    }
  }

  return null;
}

export async function getSpaceWeather(): Promise<SpaceWeatherData> {
  const observedUrl =
    "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";

  const forecastUrl =
    "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";

  const [
    observedResponse,
    forecastResponse,
  ] = await Promise.all([
    fetch(observedUrl, {
      next: {
        revalidate: 300,
      },
      headers: {
        Accept:
          "application/json",
      },
    }),

    fetch(forecastUrl, {
      next: {
        revalidate: 900,
      },
      headers: {
        Accept:
          "application/json",
      },
    }),
  ]);

  if (!observedResponse.ok) {
    throw new Error(
      `NOAA Kp svarade med status ${observedResponse.status}`
    );
  }

  const observedRaw =
    (await observedResponse.json()) as unknown;

  let observedRows: KpRow[] = [];

  if (
    Array.isArray(observedRaw)
  ) {
    /*
     * NOAA:s produkt kan returneras som en array
     * med objekt eller som tabellformat.
     */
    if (
      observedRaw.length > 0 &&
      !Array.isArray(
        observedRaw[0]
      )
    ) {
      observedRows =
        observedRaw as KpRow[];
    } else if (
      observedRaw.length > 1 &&
      Array.isArray(
        observedRaw[0]
      )
    ) {
      const headers =
        observedRaw[0] as string[];

      observedRows =
        observedRaw
          .slice(1)
          .filter(Array.isArray)
          .map((row) => {
            const values =
              row as unknown[];

            const object: KpRow =
              {};

            headers.forEach(
              (header, index) => {
                (
                  object as Record<
                    string,
                    unknown
                  >
                )[header] =
                  values[index];
              }
            );

            return object;
          });
    }
  }

  const latest =
    findLatestKp(
      observedRows
    );

  if (!latest) {
    throw new Error(
      "Kunde inte tolka NOAA:s Kp-data."
    );
  }

  let forecastKp: number | null =
    null;

  if (forecastResponse.ok) {
    try {
      const forecastRaw =
        (await forecastResponse.json()) as unknown;

      let forecastRows: KpForecastRow[] =
        [];

      if (
        Array.isArray(
          forecastRaw
        )
      ) {
        if (
          forecastRaw.length >
            0 &&
          !Array.isArray(
            forecastRaw[0]
          )
        ) {
          forecastRows =
            forecastRaw as KpForecastRow[];
        } else if (
          forecastRaw.length >
            1 &&
          Array.isArray(
            forecastRaw[0]
          )
        ) {
          const headers =
            forecastRaw[0] as string[];

          forecastRows =
            forecastRaw
              .slice(1)
              .filter(
                Array.isArray
              )
              .map((row) => {
                const values =
                  row as unknown[];

                const object: KpForecastRow =
                  {};

                headers.forEach(
                  (
                    header,
                    index
                  ) => {
                    (
                      object as Record<
                        string,
                        unknown
                      >
                    )[header] =
                      values[
                        index
                      ];
                  }
                );

                return object;
              });
        }
      }

      forecastKp =
        findForecastKp(
          forecastRows
        );
    } catch (error) {
      console.warn(
        "Kunde inte tolka NOAA:s Kp-prognos:",
        error
      );
    }
  }

  const aurora =
    getAuroraInfo(
      latest.kp
    );

  return {
    kpIndex:
      Math.round(
        latest.kp * 10
      ) / 10,

    level:
      getSpaceWeatherLevel(
        latest.kp
      ),

    stormScale:
      getStormScale(
        latest.kp
      ),

    auroraChance:
      aurora.label,

    auroraStars:
      aurora.stars,

    updatedAt:
      latest.time,

    forecastKp:
      forecastKp !== null
        ? Math.round(
            forecastKp *
              10
          ) / 10
        : null,
  };
}