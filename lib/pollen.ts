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
  pollen: PollenItem[];
  forecast: PollenForecastDay[];
};

type OpenMeteoPollenResponse = {
  timezone: string;
  hourly: {
    time: string[];
    alder_pollen: Array<number | null>;
    birch_pollen: Array<number | null>;
    grass_pollen: Array<number | null>;
    mugwort_pollen: Array<number | null>;
    ragweed_pollen: Array<number | null>;
  };
};

function safeValue(
  value: number | null | undefined
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(0, value);
}

export function getPollenLevel(
  value: number
): PollenLevel {
  if (value < 1) {
    return "Ingen";
  }

  if (value < 10) {
    return "Låg";
  }

  if (value < 50) {
    return "Måttlig";
  }

  if (value < 100) {
    return "Hög";
  }

  return "Mycket hög";
}

function getLocalHourString(): string {
  const now = new Date();

  const formatter =
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });

  const parts =
    formatter.formatToParts(now);

  const year =
    parts.find(
      (part) => part.type === "year"
    )?.value ?? "";

  const month =
    parts.find(
      (part) => part.type === "month"
    )?.value ?? "";

  const day =
    parts.find(
      (part) => part.type === "day"
    )?.value ?? "";

  const hour =
    parts.find(
      (part) => part.type === "hour"
    )?.value ?? "";

  return `${year}-${month}-${day}T${hour}:00`;
}

function getDateOnly(
  dateTime: string
): string {
  return dateTime.slice(0, 10);
}

function getMaximumForDate(
  times: string[],
  values: Array<number | null>,
  date: string
): number {
  let maximum = 0;

  times.forEach((time, index) => {
    if (getDateOnly(time) !== date) {
      return;
    }

    maximum = Math.max(
      maximum,
      safeValue(values[index])
    );
  });

  return maximum;
}

export async function getPollen(): Promise<PollenData> {
  const latitude = 57.7089;
  const longitude = 11.9746;

  const url =
    "https://air-quality-api.open-meteo.com/v1/air-quality" +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    "&hourly=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,ragweed_pollen" +
    "&timezone=Europe%2FStockholm" +
    "&forecast_days=4";

  const response = await fetch(url, {
    next: {
      revalidate: 1800,
    },
  });

  if (!response.ok) {
    throw new Error(
      "Kunde inte hämta pollendata."
    );
  }

  const data =
    (await response.json()) as OpenMeteoPollenResponse;

  const currentHour =
    getLocalHourString();

  let currentIndex =
    data.hourly.time.indexOf(
      currentHour
    );

  if (currentIndex === -1) {
    const currentTimestamp =
      new Date(currentHour).getTime();

    let smallestDifference =
      Infinity;

    data.hourly.time.forEach(
      (time, index) => {
        const timestamp =
          new Date(time).getTime();

        const difference =
          Math.abs(
            timestamp -
              currentTimestamp
          );

        if (
          Number.isFinite(
            difference
          ) &&
          difference <
            smallestDifference
        ) {
          smallestDifference =
            difference;

          currentIndex =
            index;
        }
      }
    );
  }

  if (currentIndex < 0) {
    currentIndex = 0;
  }

  const today =
    getDateOnly(
      data.hourly.time[
        currentIndex
      ]
    );

  const pollenBase: PollenItem[] = [
    {
      id: "al",
      name: "Al",
      emoji: "🌳",
      current: safeValue(
        data.hourly.alder_pollen[
          currentIndex
        ]
      ),
      todayMax:
        getMaximumForDate(
          data.hourly.time,
          data.hourly.alder_pollen,
          today
        ),
      level: "Ingen",
    },
    {
      id: "bjork",
      name: "Björk",
      emoji: "🌳",
      current: safeValue(
        data.hourly.birch_pollen[
          currentIndex
        ]
      ),
      todayMax:
        getMaximumForDate(
          data.hourly.time,
          data.hourly.birch_pollen,
          today
        ),
      level: "Ingen",
    },
    {
      id: "gras",
      name: "Gräs",
      emoji: "🌾",
      current: safeValue(
        data.hourly.grass_pollen[
          currentIndex
        ]
      ),
      todayMax:
        getMaximumForDate(
          data.hourly.time,
          data.hourly.grass_pollen,
          today
        ),
      level: "Ingen",
    },
    {
      id: "grabo",
      name: "Gråbo",
      emoji: "🌿",
      current: safeValue(
        data.hourly.mugwort_pollen[
          currentIndex
        ]
      ),
      todayMax:
        getMaximumForDate(
          data.hourly.time,
          data.hourly.mugwort_pollen,
          today
        ),
      level: "Ingen",
    },
    {
      id: "ambrosia",
      name: "Ambrosia",
      emoji: "🌼",
      current: safeValue(
        data.hourly.ragweed_pollen[
          currentIndex
        ]
      ),
      todayMax:
        getMaximumForDate(
          data.hourly.time,
          data.hourly.ragweed_pollen,
          today
        ),
      level: "Ingen",
    },
  ];

  const pollen: PollenItem[] =
    pollenBase.map((item) => ({
      ...item,
      level: getPollenLevel(
        item.todayMax
      ),
    }));

  const dates = Array.from(
    new Set(
      data.hourly.time.map(
        getDateOnly
      )
    )
  ).slice(0, 4);

  const forecast: PollenForecastDay[] =
    dates.map((date) => {
      const alder =
        getMaximumForDate(
          data.hourly.time,
          data.hourly.alder_pollen,
          date
        );

      const birch =
        getMaximumForDate(
          data.hourly.time,
          data.hourly.birch_pollen,
          date
        );

      const grass =
        getMaximumForDate(
          data.hourly.time,
          data.hourly.grass_pollen,
          date
        );

      const mugwort =
        getMaximumForDate(
          data.hourly.time,
          data.hourly.mugwort_pollen,
          date
        );

      const ragweed =
        getMaximumForDate(
          data.hourly.time,
          data.hourly.ragweed_pollen,
          date
        );

      const candidates = [
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
          name: "Ambrosia",
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
    });

  return {
    location: "Göteborg",
    updatedAt:
      data.hourly.time[
        currentIndex
      ],
    pollen,
    forecast,
  };
}