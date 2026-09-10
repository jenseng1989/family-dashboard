export type ElectricityPrice = {
  SEK_per_kWh: number;
  EUR_per_kWh: number;
  EXR: number;
  time_start: string;
  time_end: string;
};

export type ElectricityData = {
  area: "SE1" | "SE2" | "SE3" | "SE4";
  currentPrice: ElectricityPrice | null;
  minPrice: ElectricityPrice;
  maxPrice: ElectricityPrice;
  averagePrice: number;
  prices: ElectricityPrice[];
  tomorrowPrices: ElectricityPrice[];
  tomorrowMinPrice: ElectricityPrice | null;
  tomorrowMaxPrice: ElectricityPrice | null;
  tomorrowAveragePrice: number | null;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
};

type NordPoolEntry = {
  deliveryStart?: string;
  deliveryEnd?: string;
  entryPerArea?: Record<string, number | string | null>;
};

type NordPoolResponse = {
  currency?: string;
  multiAreaEntries?: NordPoolEntry[];
};

const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

function getStockholmDateParts(date: Date): DateParts {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).formatToParts(date);

  return {
    year: Number(
      parts.find((part) => part.type === "year")?.value ?? "0"
    ),
    month: Number(
      parts.find((part) => part.type === "month")?.value ?? "0"
    ),
    day: Number(
      parts.find((part) => part.type === "day")?.value ?? "0"
    ),
  };
}

function addDays(parts: DateParts, days: number): DateParts {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days, 12)
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function formatDate(parts: DateParts): string {
  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function buildElprisetJustNuUrl(
  parts: DateParts,
  area: ElectricityData["area"]
): string {
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");

  return `https://www.elprisetjustnu.se/api/v1/prices/${parts.year}/${month}-${day}_${area}.json`;
}

function buildNordPoolUrl(
  parts: DateParts,
  area: ElectricityData["area"]
): string {
  const params = new URLSearchParams({
    date: formatDate(parts),
    market: "DayAhead",
    deliveryArea: area,
    currency: "SEK",
  });

  return `https://dataportal-api.nordpoolgroup.com/api/DayAheadPrices?${params.toString()}`;
}

async function fetchFromElprisetJustNu(
  parts: DateParts,
  area: ElectricityData["area"],
  optional = false
): Promise<ElectricityPrice[]> {
  try {
    const response = await fetch(
      buildElprisetJustNuUrl(parts, area),
      {
        next: {
          revalidate: 900,
        },
      }
    );

    if (!response.ok) {
      if (optional && response.status === 404) {
        return [];
      }

      throw new Error(
        `Elprisetjustnu svarade med ${response.status}`
      );
    }

    const data = (await response.json()) as unknown;

    if (!Array.isArray(data)) {
      if (optional) {
        return [];
      }

      throw new Error(
        "Elprisetjustnu returnerade ett oväntat svar"
      );
    }

    return data as ElectricityPrice[];
  } catch (error) {
    if (optional) {
      console.warn(
        "Elprisetjustnu kunde inte leverera det valfria prisdygnet:",
        error
      );
      return [];
    }

    throw error;
  }
}

async function fetchFromNordPool(
  parts: DateParts,
  area: ElectricityData["area"]
): Promise<ElectricityPrice[]> {
  try {
    const response = await fetch(
      buildNordPoolUrl(parts, area),
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (response.status === 204) {
      return [];
    }

    if (!response.ok) {
      console.warn(
        `Nord Pool svarade med ${response.status}`
      );
      return [];
    }

    const data =
      (await response.json()) as NordPoolResponse;

    if (!Array.isArray(data.multiAreaEntries)) {
      return [];
    }

    return data.multiAreaEntries
      .map((entry): ElectricityPrice | null => {
        const rawPrice = entry.entryPerArea?.[area];

        if (
          !entry.deliveryStart ||
          !entry.deliveryEnd ||
          rawPrice === null ||
          rawPrice === undefined
        ) {
          return null;
        }

        const sekPerMWh =
          typeof rawPrice === "number"
            ? rawPrice
            : Number(
                String(rawPrice)
                  .replace(/\s/g, "")
                  .replace(",", ".")
              );

        if (!Number.isFinite(sekPerMWh)) {
          return null;
        }

        return {
          SEK_per_kWh: sekPerMWh / 1000,
          EUR_per_kWh: 0,
          EXR: 0,
          time_start: entry.deliveryStart,
          time_end: entry.deliveryEnd,
        };
      })
      .filter(
        (price): price is ElectricityPrice =>
          price !== null
      );
  } catch (error) {
    console.warn(
      "Nord Pool-reserven kunde inte hämta priser:",
      error
    );
    return [];
  }
}

async function fetchPricesForDate(
  parts: DateParts,
  area: ElectricityData["area"],
  optional = false
): Promise<ElectricityPrice[]> {
  const primary = await fetchFromElprisetJustNu(
    parts,
    area,
    optional
  );

  if (primary.length > 0) {
    return primary;
  }

  if (!optional) {
    throw new Error("Kunde inte hämta dagens elpriser");
  }

  // Reservkälla för morgondagen. Detta gör widgeten mindre känslig
  // om Elprisetjustnu publicerar morgondagens prisfil sent.
  return fetchFromNordPool(parts, area);
}

function getPriceStats(prices: ElectricityPrice[]) {
  if (prices.length === 0) {
    return {
      minPrice: null,
      maxPrice: null,
      averagePrice: null,
    };
  }

  const minPrice = prices.reduce((min, price) =>
    price.SEK_per_kWh < min.SEK_per_kWh
      ? price
      : min
  );

  const maxPrice = prices.reduce((max, price) =>
    price.SEK_per_kWh > max.SEK_per_kWh
      ? price
      : max
  );

  const averagePrice =
    prices.reduce(
      (sum, price) => sum + price.SEK_per_kWh,
      0
    ) / prices.length;

  return {
    minPrice,
    maxPrice,
    averagePrice,
  };
}

export async function getElectricityPrices(
  area: ElectricityData["area"] = "SE3"
): Promise<ElectricityData> {
  const now = new Date();
  const today = getStockholmDateParts(now);
  const tomorrow = addDays(today, 1);

  const [prices, tomorrowPrices] =
    await Promise.all([
      fetchPricesForDate(today, area),
      fetchPricesForDate(tomorrow, area, true),
    ]);

  if (prices.length === 0) {
    throw new Error("Dagens elpriser saknas");
  }

  const currentPrice =
    prices.find((price) => {
      const start = new Date(price.time_start);
      const end = new Date(price.time_end);

      return now >= start && now < end;
    }) ?? null;

  const todayStats = getPriceStats(prices);
  const tomorrowStats =
    getPriceStats(tomorrowPrices);

  if (
    !todayStats.minPrice ||
    !todayStats.maxPrice ||
    todayStats.averagePrice === null
  ) {
    throw new Error(
      "Dagens elpriser kunde inte sammanställas"
    );
  }

  return {
    area,
    currentPrice,
    minPrice: todayStats.minPrice,
    maxPrice: todayStats.maxPrice,
    averagePrice: todayStats.averagePrice,
    prices,
    tomorrowPrices,
    tomorrowMinPrice: tomorrowStats.minPrice,
    tomorrowMaxPrice: tomorrowStats.maxPrice,
    tomorrowAveragePrice:
      tomorrowStats.averagePrice,
  };
}

export function formatPrice(price: number): string {
  return price.toFixed(2).replace(".", ",");
}

export function formatHour(
  dateString: string
): string {
  return new Date(dateString).toLocaleTimeString(
    "sv-SE",
    {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: STOCKHOLM_TIME_ZONE,
    }
  );
}
