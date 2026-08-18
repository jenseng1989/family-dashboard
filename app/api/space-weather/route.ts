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

type ForecastPoint = {
  time: string;
  kp: number;
};

type RtswMagRow = {
  time_tag?: string;
  bt?: number | string;
  bx_gsm?: number | string;
  by_gsm?: number | string;
  bz_gsm?: number | string;
};

type RtswWindRow = {
  time_tag?: string;
  proton_speed?: number | string;
  proton_density?: number | string;
};

const OBSERVED_URL =
  "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";

const FORECAST_URL =
  "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";

const MAG_URL =
  "https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json";

const WIND_URL =
  "https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json";

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

function normalizeHeader(
  value: unknown
): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function parseTable(
  data: unknown
): {
  headers: string[];
  rows: unknown[][];
} | null {
  if (
    !Array.isArray(data) ||
    data.length < 2 ||
    !Array.isArray(data[0])
  ) {
    return null;
  }

  return {
    headers:
      data[0].map(
        normalizeHeader
      ),

    rows:
      data
        .slice(1)
        .filter(
          (
            row
          ): row is unknown[] =>
            Array.isArray(row)
        ),
  };
}

function findColumn(
  headers: string[],
  candidates: string[]
): number {
  const normalizedCandidates =
    candidates.map(
      normalizeHeader
    );

  return headers.findIndex(
    (header) =>
      normalizedCandidates.includes(
        header
      )
  );
}

function parseKpData(
  data: unknown
): ParsedKpRow[] {
  const table =
    parseTable(data);

  if (!table) {
    return [];
  }

  const timeIndex =
    findColumn(
      table.headers,
      [
        "time_tag",
        "time",
        "timestamp",
      ]
    );

  const kpIndex =
    findColumn(
      table.headers,
      [
        "kp",
        "kp_index",
        "estimated_kp",
        "predicted_kp",
      ]
    );

  if (kpIndex < 0) {
    return [];
  }

  return table.rows
    .map((row) => ({
      time:
        timeIndex >= 0 &&
        typeof row[
          timeIndex
        ] === "string"
          ? String(
              row[
                timeIndex
              ]
            )
          : null,

      kp:
        safeNumber(
          row[
            kpIndex
          ]
        ),
    }))
    .filter(
      (row) =>
        row.kp !== null
    );
}

function parseRtswMag(
  data: unknown
): {
  time: string | null;
  bz: number | null;
  bt: number | null;
} {
  if (!Array.isArray(data)) {
    return {
      time: null,
      bz: null,
      bt: null,
    };
  }

  const rows =
    data.filter(
      (
        item
      ): item is RtswMagRow =>
        typeof item ===
          "object" &&
        item !== null &&
        !Array.isArray(item)
    );

  /*
   * NOAA brukar lägga senaste
   * mätningen först, men vi går
   * igenom hela listan för att
   * hitta första kompletta
   * observationen.
   */
  for (
    const row of rows
  ) {
    const bz =
      safeNumber(
        row.bz_gsm
      );

    const bt =
      safeNumber(
        row.bt
      );

    if (
      bz !== null ||
      bt !== null
    ) {
      return {
        time:
          row.time_tag ??
          null,

        bz,
        bt,
      };
    }
  }

  return {
    time: null,
    bz: null,
    bt: null,
  };
}

function parseRtswWind(
  data: unknown
): {
  time: string | null;
  speed: number | null;
  density: number | null;
} {
  if (!Array.isArray(data)) {
    return {
      time: null,
      speed: null,
      density: null,
    };
  }

  const rows =
    data.filter(
      (
        item
      ): item is RtswWindRow =>
        typeof item ===
          "object" &&
        item !== null &&
        !Array.isArray(item)
    );

  for (
    const row of rows
  ) {
    const speed =
      safeNumber(
        row.proton_speed
      );

    const density =
      safeNumber(
        row.proton_density
      );

    if (
      speed !== null ||
      density !== null
    ) {
      return {
        time:
          row.time_tag ??
          null,

        speed,
        density,
      };
    }
  }

  return {
    time: null,
    speed: null,
    density: null,
  };
}

async function fetchJsonSafe(
  url: string
): Promise<unknown | null> {
  try {
    const response =
      await fetch(url, {
        headers: {
          Accept:
            "application/json",

          "User-Agent":
            "Family-Dashboard/1.0",
        },

        next: {
          revalidate: 300,
        },
      });

    if (!response.ok) {
      console.warn(
        `NOAA svarade ${response.status} för ${url}`
      );

      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(
      `Kunde inte hämta ${url}:`,
      error
    );

    return null;
  }
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
    return "G0";
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

function getStormDescription(
  kp: number
): string {
  if (kp < 5) {
    return "Ingen geomagnetisk storm";
  }

  if (kp < 6) {
    return "Mindre geomagnetisk storm";
  }

  if (kp < 7) {
    return "Måttlig geomagnetisk storm";
  }

  if (kp < 8) {
    return "Kraftig geomagnetisk storm";
  }

  if (kp < 9) {
    return "Mycket kraftig geomagnetisk storm";
  }

  return "Extrem geomagnetisk storm";
}

function getWindStatus(
  value: number | null
): string {
  if (value === null) {
    return "Ingen data";
  }

  if (value < 350) {
    return "Långsam";
  }

  if (value < 450) {
    return "Normal";
  }

  if (value < 550) {
    return "Förhöjd";
  }

  if (value < 700) {
    return "Snabb";
  }

  return "Mycket snabb";
}

function getBzStatus(
  value: number | null
): string {
  if (value === null) {
    return "Ingen data";
  }

  if (value <= -10) {
    return "Mycket gynnsamt";
  }

  if (value <= -5) {
    return "Gynnsamt";
  }

  if (value < 0) {
    return "Svagt gynnsamt";
  }

  if (value < 5) {
    return "Neutralt";
  }

  return "Mindre gynnsamt";
}

function getBtStatus(
  value: number | null
): string {
  if (value === null) {
    return "Ingen data";
  }

  if (value < 5) {
    return "Svagt";
  }

  if (value < 10) {
    return "Måttligt";
  }

  if (value < 20) {
    return "Starkt";
  }

  return "Mycket starkt";
}

function getDensityStatus(
  value: number | null
): string {
  if (value === null) {
    return "Ingen data";
  }

  if (value < 3) {
    return "Låg";
  }

  if (value < 8) {
    return "Normal";
  }

  if (value < 15) {
    return "Förhöjd";
  }

  return "Hög";
}

function getAuroraInfo(
  kp: number,
  windSpeed: number | null,
  bz: number | null,
  bt: number | null
): {
  text: string;
  stars: number;
  explanation: string;
} {
  let score = 0;

  if (kp >= 6) {
    score += 4;
  } else if (kp >= 5) {
    score += 3;
  } else if (kp >= 4) {
    score += 2;
  } else if (kp >= 3) {
    score += 1;
  }

  if (
    windSpeed !== null &&
    windSpeed >= 500
  ) {
    score += 1;
  }

  if (bz !== null) {
    if (bz <= -10) {
      score += 3;
    } else if (
      bz <= -5
    ) {
      score += 2;
    } else if (
      bz < 0
    ) {
      score += 1;
    }
  }

  if (
    bt !== null &&
    bt >= 10
  ) {
    score += 1;
  }

  const stars =
    Math.min(
      5,
      Math.max(
        1,
        Math.ceil(
          score / 2
        )
      )
    );

  if (stars >= 5) {
    return {
      text:
        "Mycket bra",

      stars,

      explanation:
        "Kp, solvind och magnetfält ger mycket gynnsamma förutsättningar. Lokal molnighet och mörker avgör om norrsken faktiskt syns.",
    };
  }

  if (stars === 4) {
    return {
      text:
        "Bra",

      stars,

      explanation:
        "Rymdvädret är gynnsamt för norrsken. Särskilt sydlig Bz kan förbättra förutsättningarna.",
    };
  }

  if (stars === 3) {
    return {
      text:
        "Möjlig",

      stars,

      explanation:
        "Det finns viss geomagnetisk aktivitet. Klara och mörka förhållanden kan ge chans till norrsken.",
    };
  }

  if (stars === 2) {
    return {
      text:
        "Låg",

      stars,

      explanation:
        "Aktiviteten är relativt låg och norrsken från Göteborg är mindre sannolikt.",
    };
  }

  return {
    text:
      "Mycket låg",

    stars,

    explanation:
      "Rymdvädret är lugnt och norrsken från Göteborg är osannolikt.",
  };
}

function roundOne(
  value: number
): number {
  return (
    Math.round(
      value * 10
    ) / 10
  );
}

function buildForecast(
  rows: ParsedKpRow[],
  now: number
): ForecastPoint[] {
  const result:
    ForecastPoint[] = [];

  for (
    const row of rows
  ) {
    if (
      row.kp === null ||
      !row.time
    ) {
      continue;
    }

    const timestamp =
      new Date(
        row.time
      ).getTime();

    if (
      !Number.isFinite(
        timestamp
      ) ||
      timestamp < now
    ) {
      continue;
    }

    result.push({
      time:
        row.time,

      kp:
        roundOne(
          row.kp
        ),
    });

    if (
      result.length >= 8
    ) {
      break;
    }
  }

  return result;
}

function getTrend(
  rows: ParsedKpRow[]
):
  | "Stiger"
  | "Stabil"
  | "Sjunker" {
  const values =
    rows
      .slice(-4)
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

  if (
    values.length < 2
  ) {
    return "Stabil";
  }

  const difference =
    values[
      values.length - 1
    ] - values[0];

  if (
    difference >= 0.7
  ) {
    return "Stiger";
  }

  if (
    difference <= -0.7
  ) {
    return "Sjunker";
  }

  return "Stabil";
}

export async function GET() {
  try {
    const [
      observedData,
      forecastData,
      magneticData,
      windData,
    ] =
      await Promise.all([
        fetchJsonSafe(
          OBSERVED_URL
        ),

        fetchJsonSafe(
          FORECAST_URL
        ),

        fetchJsonSafe(
          MAG_URL
        ),

        fetchJsonSafe(
          WIND_URL
        ),
      ]);

    const observedRows =
      observedData
        ? parseKpData(
            observedData
          )
        : [];

    const forecastRows =
      forecastData
        ? parseKpData(
            forecastData
          )
        : [];

    let currentKpRow:
      ParsedKpRow | null =
      null;

    if (
      observedRows.length >
      0
    ) {
      currentKpRow =
        observedRows[
          observedRows.length -
            1
        ];
    } else if (
      forecastRows.length >
      0
    ) {
      currentKpRow =
        forecastRows[0];
    }

    const currentKp =
      currentKpRow?.kp ??
      0;

    const maxKp24h =
      observedRows.length >
      0
        ? Math.max(
            ...observedRows.map(
              (row) =>
                row.kp ??
                0
            )
          )
        : currentKp;

    const magnetic =
      magneticData
        ? parseRtswMag(
            magneticData
          )
        : {
            time: null,
            bz: null,
            bt: null,
          };

    const wind =
      windData
        ? parseRtswWind(
            windData
          )
        : {
            time: null,
            speed: null,
            density: null,
          };

    const forecast =
      buildForecast(
        forecastRows,
        Date.now()
      );

    const forecastValues =
      forecast.map(
        (point) =>
          point.kp
      );

    const maximumForecast =
      forecastValues.length >
      0
        ? Math.max(
            ...forecastValues
          )
        : null;

    const nextForecast =
      forecast[0] ??
      null;

    const aurora =
      getAuroraInfo(
        currentKp,
        wind.speed,
        magnetic.bz,
        magnetic.bt
      );

    return NextResponse.json(
      {
        kpIndex:
          roundOne(
            currentKp
          ),

        maxKp24h:
          roundOne(
            maxKp24h
          ),

        forecastKp:
          nextForecast?.kp ??
          null,

        maxForecastKp:
          maximumForecast !==
          null
            ? roundOne(
                maximumForecast
              )
            : null,

        forecast,

        level:
          getLevel(
            currentKp
          ),

        stormScale:
          getStormScale(
            currentKp
          ),

        stormDescription:
          getStormDescription(
            currentKp
          ),

        trend:
          getTrend(
            observedRows
          ),

        solarWindSpeed:
          wind.speed !==
          null
            ? Math.round(
                wind.speed
              )
            : null,

        solarWindStatus:
          getWindStatus(
            wind.speed
          ),

        protonDensity:
          wind.density !==
          null
            ? roundOne(
                wind.density
              )
            : null,

        protonDensityStatus:
          getDensityStatus(
            wind.density
          ),

        bz:
          magnetic.bz !==
          null
            ? roundOne(
                magnetic.bz
              )
            : null,

        bzStatus:
          getBzStatus(
            magnetic.bz
          ),

        bt:
          magnetic.bt !==
          null
            ? roundOne(
                magnetic.bt
              )
            : null,

        btStatus:
          getBtStatus(
            magnetic.bt
          ),

        auroraChance:
          aurora.text,

        auroraStars:
          aurora.stars,

        auroraExplanation:
          aurora.explanation,

        updatedAt:
          currentKpRow?.time ??
          new Date().toISOString(),

        solarWindUpdatedAt:
          wind.time,

        magneticFieldUpdatedAt:
          magnetic.time,

        source:
          "NOAA SWPC",

        dataStatus: {
          kp:
            observedRows.length >
            0,

          kpForecast:
            forecastRows.length >
            0,

          magneticField:
            magnetic.bz !==
              null ||
            magnetic.bt !==
              null,

          plasma:
            wind.speed !==
              null ||
            wind.density !==
              null,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error(
      "Oväntat fel i Rymdväder:",
      error
    );

    return NextResponse.json(
      {
        kpIndex: 0,
        maxKp24h: 0,

        forecastKp:
          null,

        maxForecastKp:
          null,

        forecast: [],

        level:
          "Lugn",

        stormScale:
          "G0",

        stormDescription:
          "Rymdväderdata är tillfälligt otillgänglig",

        trend:
          "Stabil",

        solarWindSpeed:
          null,

        solarWindStatus:
          "Ingen data",

        protonDensity:
          null,

        protonDensityStatus:
          "Ingen data",

        bz: null,

        bzStatus:
          "Ingen data",

        bt: null,

        btStatus:
          "Ingen data",

        auroraChance:
          "Okänd",

        auroraStars:
          1,

        auroraExplanation:
          "NOAA:s realtidsdata kunde inte hämtas just nu.",

        updatedAt:
          new Date().toISOString(),

        solarWindUpdatedAt:
          null,

        magneticFieldUpdatedAt:
          null,

        source:
          "NOAA SWPC",

        dataStatus: {
          kp: false,
          kpForecast: false,
          magneticField: false,
          plasma: false,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}