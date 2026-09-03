export type PollenType =
  | "al"
  | "bjork"
  | "gras"
  | "grabo"
  | "ambrosia";

export type PollenLevel =
  | "Ingen"
  | "Låg"
  | "Måttlig"
  | "Hög"
  | "Mycket hög";

export type PollenItem = {
  id: PollenType;
  name: string;
  emoji: string;
  current: number;
  todayMax: number;
  level: PollenLevel;
};

export type PollenForecastDay = {
  date: string;
  alder: number;
  birch: number;
  grass: number;
  mugwort: number;
  ragweed: number;
  highestValue: number;
  highestName: string;
};

export type PollenData = {
  location: string;
  updatedAt: string;
  source: string;
  sourceUrl: string;
  forecastText: string | null;
  pollen: PollenItem[];
  forecast: PollenForecastDay[];
};

type ApiListResponse<T> = {
  items?: T[];
  _meta?: {
    count?: number;
    totalRecords?: number;
  };
};

type Region = {
  id: string;
  name: string;
};

type PollenApiType = {
  id: string;
  name: string;
};

type ForecastLevel = {
  level: number;
  pollenId: string;
  time: string;
};

type Forecast = {
  id: string;
  regionId: string;
  startDate: string;
  endDate: string;
  text: string;
  isEndOfSeason: boolean;
  levelSeries: ForecastLevel[];
};

const API_BASE =
  "https://api.pollenrapporten.se/v1";

const SOURCE_URL =
  "https://pollenrapporten.se/";

const CACHE_SECONDS = 30 * 60;

const TARGET_TYPES: Array<{
  id: PollenType;
  apiNames: string[];
  displayName: string;
  emoji: string;
}> = [
  {
    id: "al",
    apiNames: ["Al"],
    displayName: "Al",
    emoji: "🌳",
  },
  {
    id: "bjork",
    apiNames: ["Björk"],
    displayName: "Björk",
    emoji: "🌳",
  },
  {
    id: "gras",
    apiNames: ["Gräs"],
    displayName: "Gräs",
    emoji: "🌾",
  },
  {
    id: "grabo",
    apiNames: ["Gråbo"],
    displayName: "Gråbo",
    emoji: "🌿",
  },
  {
    id: "ambrosia",
    apiNames: [
      "Malörtsambrosia",
      "Ambrosia",
    ],
    displayName: "Malörtsambrosia",
    emoji: "🌼",
  },
];

function normalizeText(
  value: string
) {
  return value
    .toLocaleLowerCase("sv-SE")
    .trim();
}

function clampLevel(
  value: number | null | undefined
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      4,
      Math.round(value)
    )
  );
}

export function getPollenLevel(
  value: number
): PollenLevel {
  switch (clampLevel(value)) {
    case 4:
      return "Mycket hög";
    case 3:
      return "Hög";
    case 2:
      return "Måttlig";
    case 1:
      return "Låg";
    case 0:
    default:
      return "Ingen";
  }
}

async function fetchApi<T>(
  path: string
): Promise<T> {
  const response =
    await fetch(
      `${API_BASE}${path}`,
      {
        headers: {
          Accept:
            "application/json",
        },
        next: {
          revalidate:
            CACHE_SECONDS,
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `Pollenrapporten svarade med HTTP ${response.status}`
    );
  }

  return (
    await response.json()
  ) as T;
}

function getDateOnly(
  value: string
) {
  return value.slice(0, 10);
}

function getTodayString() {
  return new Intl.DateTimeFormat(
    "sv-SE",
    {
      timeZone:
        "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());
}

function addDays(
  dateString: string,
  days: number
) {
  const [
    year,
    month,
    day,
  ] =
    dateString
      .split("-")
      .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day + days
      )
    );

  return date
    .toISOString()
    .slice(0, 10);
}

function findPollenApiType(
  pollenTypes:
    PollenApiType[],
  apiNames:
    string[]
) {
  const wanted =
    apiNames.map(
      normalizeText
    );

  return (
    pollenTypes.find(
      (item) =>
        wanted.includes(
          normalizeText(
            item.name
          )
        )
    ) ?? null
  );
}

function levelForDate(
  forecast:
    Forecast,
  pollenId:
    string | null,
  date:
    string
) {
  if (!pollenId) {
    return 0;
  }

  const matches =
    forecast.levelSeries.filter(
      (item) =>
        item.pollenId ===
          pollenId &&
        getDateOnly(
          item.time
        ) === date
    );

  if (
    matches.length === 0
  ) {
    return 0;
  }

  return Math.max(
    ...matches.map(
      (item) =>
        clampLevel(
          item.level
        )
    )
  );
}

export async function getPollen():
  Promise<PollenData> {
  const [
    regionsResponse,
    pollenTypesResponse,
  ] =
    await Promise.all([
      fetchApi<
        ApiListResponse<Region>
      >(
        "/regions?offset=0&limit=100"
      ),
      fetchApi<
        ApiListResponse<PollenApiType>
      >(
        "/pollen-types?offset=0&limit=100"
      ),
    ]);

  const regions =
    regionsResponse.items ??
    [];

  const pollenTypes =
    pollenTypesResponse.items ??
    [];

  const gothenburg =
    regions.find(
      (region) =>
        normalizeText(
          region.name
        ) ===
        "göteborg"
    );

  if (!gothenburg) {
    throw new Error(
      "Göteborg finns inte bland Pollenrapportens regioner."
    );
  }

  const forecastResponse =
    await fetchApi<
      ApiListResponse<Forecast>
    >(
      `/forecasts?region_id=${encodeURIComponent(
        gothenburg.id
      )}&current=true&offset=0&limit=100`
    );

  const forecasts =
    forecastResponse.items ??
    [];

  if (
    forecasts.length === 0
  ) {
    throw new Error(
      "Pollenrapporten returnerade ingen aktuell prognos för Göteborg."
    );
  }

  /*
   * Om API:t skulle returnera fler än en aktuell
   * prognos väljer vi den med senaste startdatum.
   */
  const forecast =
    [...forecasts].sort(
      (a, b) =>
        b.startDate.localeCompare(
          a.startDate
        )
    )[0];

  const typeIds =
    new Map<
      PollenType,
      string | null
    >();

  for (
    const target of
    TARGET_TYPES
  ) {
    const apiType =
      findPollenApiType(
        pollenTypes,
        target.apiNames
      );

    typeIds.set(
      target.id,
      apiType?.id ?? null
    );
  }

  const today =
    getTodayString();

  const forecastDates =
    Array.from(
      new Set(
        forecast.levelSeries.map(
          (item) =>
            getDateOnly(
              item.time
            )
        )
      )
    )
      .filter(
        (date) =>
          date >= today
      )
      .sort()
      .slice(0, 4);

  /*
   * Om nivåserien inte innehåller fyra datum
   * fyller vi på med kalenderdagar för ett stabilt UI.
   */
  while (
    forecastDates.length <
    4
  ) {
    const next =
      addDays(
        today,
        forecastDates.length
      );

    if (
      !forecastDates.includes(
        next
      )
    ) {
      forecastDates.push(
        next
      );
    } else {
      break;
    }
  }

  const currentDate =
    forecastDates[0] ??
    today;

  const pollen:
    PollenItem[] =
    TARGET_TYPES.map(
      (target) => {
        const value =
          levelForDate(
            forecast,
            typeIds.get(
              target.id
            ) ?? null,
            currentDate
          );

        return {
          id: target.id,
          name:
            target.displayName,
          emoji:
            target.emoji,
          current:
            value,
          todayMax:
            value,
          level:
            getPollenLevel(
              value
            ),
        };
      }
    );

  const forecastDays:
    PollenForecastDay[] =
    forecastDates.map(
      (date) => {
        const alder =
          levelForDate(
            forecast,
            typeIds.get(
              "al"
            ) ?? null,
            date
          );

        const birch =
          levelForDate(
            forecast,
            typeIds.get(
              "bjork"
            ) ?? null,
            date
          );

        const grass =
          levelForDate(
            forecast,
            typeIds.get(
              "gras"
            ) ?? null,
            date
          );

        const mugwort =
          levelForDate(
            forecast,
            typeIds.get(
              "grabo"
            ) ?? null,
            date
          );

        const ragweed =
          levelForDate(
            forecast,
            typeIds.get(
              "ambrosia"
            ) ?? null,
            date
          );

        const candidates =
          [
            {
              name: "Al",
              value: alder,
            },
            {
              name: "Björk",
              value: birch,
            },
            {
              name: "Gräs",
              value: grass,
            },
            {
              name: "Gråbo",
              value: mugwort,
            },
            {
              name:
                "Malörtsambrosia",
              value: ragweed,
            },
          ];

        const highest =
          candidates.reduce(
            (
              currentHighest,
              candidate
            ) =>
              candidate.value >
              currentHighest.value
                ? candidate
                : currentHighest,
            candidates[0]
          );

        return {
          date,
          alder,
          birch,
          grass,
          mugwort,
          ragweed,
          highestValue:
            highest.value,
          highestName:
            highest.name,
        };
      }
    );

  return {
    location:
      gothenburg.name,
    updatedAt:
      forecast.startDate,
    source:
      "Pollenrapporten / Naturhistoriska riksmuseet",
    sourceUrl:
      SOURCE_URL,
    forecastText:
      forecast.text ||
      null,
    pollen,
    forecast:
      forecastDays,
  };
}
