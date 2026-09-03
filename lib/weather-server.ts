import "server-only";

import type { WeatherData } from "@/lib/weather";

const LATITUDE = 57.7089;
const LONGITUDE = 11.9746;

const WEATHER_MEMORY_CACHE_MS =
  15 * 60 * 1000;

const WEATHER_STALE_CACHE_MS =
  60 * 60 * 1000;

const OPEN_METEO_COOLDOWN_MS =
  30 * 60 * 1000;

const REQUEST_TIMEOUT_MS =
  8_000;

let cachedWeather:
  WeatherData | null = null;

let cachedAt = 0;

let inFlight:
  Promise<WeatherData> | null =
  null;

let openMeteoBlockedUntil = 0;

function isFreshCache() {
  return (
    cachedWeather !== null &&
    Date.now() - cachedAt <
      WEATHER_MEMORY_CACHE_MS
  );
}

function canUseStaleCache() {
  return (
    cachedWeather !== null &&
    Date.now() - cachedAt <
      WEATHER_STALE_CACHE_MS
  );
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit
) {
  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

  try {
    return await fetch(
      url,
      {
        ...init,
        signal:
          controller.signal,
      }
    );
  } finally {
    clearTimeout(
      timeoutId
    );
  }
}

function getOpenMeteoUrl() {
  return (
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${LATITUDE}` +
    `&longitude=${LONGITUDE}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day" +
    "&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum" +
    "&timezone=auto"
  );
}

async function fetchOpenMeteo():
  Promise<WeatherData> {
  if (
    Date.now() <
    openMeteoBlockedUntil
  ) {
    throw new Error(
      "OPEN_METEO_COOLDOWN"
    );
  }

  const response =
    await fetchWithTimeout(
      getOpenMeteoUrl(),
      {
        next: {
          revalidate:
            15 * 60,
        },
      }
    );

  if (
    response.status === 429
  ) {
    openMeteoBlockedUntil =
      Date.now() +
      OPEN_METEO_COOLDOWN_MS;

    throw new Error(
      "OPEN_METEO_RATE_LIMIT"
    );
  }

  if (!response.ok) {
    throw new Error(
      `Open-Meteo HTTP ${response.status}`
    );
  }

  const data =
    await response.json();

  if (
    !data?.current ||
    !data?.daily ||
    !data?.hourly
  ) {
    throw new Error(
      "Open-Meteo returnerade ofullständig data."
    );
  }

  return {
    location:
      "Göteborg",
    temperature:
      data.current
        .temperature_2m,
    apparentTemperature:
      data.current
        .apparent_temperature,
    windSpeed:
      data.current
        .wind_speed_10m,
    humidity:
      data.current
        .relative_humidity_2m,
    uvIndex:
      data.daily
        .uv_index_max[0] ??
      0,
    precipitation:
      data.current
        .precipitation ??
      0,
    weatherCode:
      data.current
        .weather_code,
    isDay:
      data.current
        .is_day === 1,
    sunrise:
      data.daily.sunrise[0],
    sunset:
      data.daily.sunset[0],
    daily: {
      time:
        data.daily.time,
      temperatureMax:
        data.daily
          .temperature_2m_max,
      temperatureMin:
        data.daily
          .temperature_2m_min,
      weatherCode:
        data.daily
          .weather_code,
      uvIndexMax:
        data.daily
          .uv_index_max,
      precipitationSum:
        data.daily
          .precipitation_sum,
    },
    hourly: {
      time:
        data.hourly.time,
      temperature:
        data.hourly
          .temperature_2m,
      apparentTemperature:
        data.hourly
          .apparent_temperature,
      precipitationProbability:
        data.hourly
          .precipitation_probability,
      weatherCode:
        data.hourly
          .weather_code,
      windSpeed:
        data.hourly
          .wind_speed_10m,
    },
  };
}

type MetTimeseriesItem = {
  time: string;
  data?: {
    instant?: {
      details?: {
        air_temperature?: number;
        relative_humidity?: number;
        ultraviolet_index_clear_sky?: number;
        wind_speed?: number;
      };
    };
    next_1_hours?: {
      summary?: {
        symbol_code?: string;
      };
      details?: {
        precipitation_amount?: number;
        probability_of_precipitation?: number;
      };
    };
    next_6_hours?: {
      summary?: {
        symbol_code?: string;
      };
      details?: {
        precipitation_amount?: number;
        probability_of_precipitation?: number;
      };
    };
  };
};

function symbolToWmoCode(
  symbol:
    string | undefined
): number {
  if (!symbol) {
    return 3;
  }

  const value =
    symbol.toLowerCase();

  if (
    value.includes(
      "thunder"
    )
  ) {
    return 95;
  }

  if (
    value.includes(
      "heavyrain"
    )
  ) {
    return 65;
  }

  if (
    value.includes(
      "rainshowers"
    )
  ) {
    return 80;
  }

  if (
    value.includes("rain")
  ) {
    return 61;
  }

  if (
    value.includes(
      "heavysnow"
    )
  ) {
    return 75;
  }

  if (
    value.includes(
      "snowshowers"
    )
  ) {
    return 85;
  }

  if (
    value.includes("snow")
  ) {
    return 71;
  }

  if (
    value.includes(
      "sleet"
    )
  ) {
    return 68;
  }

  if (
    value.includes(
      "fog"
    )
  ) {
    return 45;
  }

  if (
    value.includes(
      "partlycloudy"
    )
  ) {
    return 2;
  }

  if (
    value.includes(
      "cloudy"
    )
  ) {
    return 3;
  }

  if (
    value.includes(
      "fair"
    )
  ) {
    return 1;
  }

  if (
    value.includes(
      "clearsky"
    )
  ) {
    return 0;
  }

  return 3;
}

function getStockholmDate(
  value: string | Date
): string {
  return new Intl.DateTimeFormat(
    "sv-SE",
    {
      timeZone:
        "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  )
    .format(
      typeof value ===
        "string"
        ? new Date(value)
        : value
    )
    .replace(
      /(\d{4})-(\d{2})-(\d{2})/,
      "$1-$2-$3"
    );
}

function isDaySymbol(
  symbol:
    string | undefined
) {
  if (!symbol) {
    return true;
  }

  return !symbol.includes(
    "_night"
  );
}

function nearestTimeseries(
  items:
    MetTimeseriesItem[]
) {
  const now =
    Date.now();

  return items.reduce(
    (
      best,
      item
    ) => {
      const bestDiff =
        Math.abs(
          new Date(
            best.time
          ).getTime() -
            now
        );

      const itemDiff =
        Math.abs(
          new Date(
            item.time
          ).getTime() -
            now
        );

      return itemDiff <
        bestDiff
        ? item
        : best;
    },
    items[0]
  );
}

async function fetchSunTimes() {
  const today =
    getStockholmDate(
      new Date()
    );

  const url =
    "https://api.met.no/weatherapi/sunrise/3.0/sun" +
    `?lat=${LATITUDE}` +
    `&lon=${LONGITUDE}` +
    `&date=${today}`;

  const response =
    await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent":
            "FamilyDashboard/1.0",
          Accept:
            "application/json",
        },
        next: {
          revalidate:
            12 * 60 * 60,
        },
      }
    );

  if (!response.ok) {
    return {
      sunrise: "",
      sunset: "",
    };
  }

  const data =
    await response.json();

  return {
    sunrise:
      data?.properties
        ?.sunrise?.time ??
      "",
    sunset:
      data?.properties
        ?.sunset?.time ??
      "",
  };
}

async function fetchMetNorway():
  Promise<WeatherData> {
  const url =
    "https://api.met.no/weatherapi/locationforecast/2.0/complete" +
    `?lat=${LATITUDE}` +
    `&lon=${LONGITUDE}`;

  const [
    response,
    sunTimes,
  ] =
    await Promise.all([
      fetchWithTimeout(
        url,
        {
          headers: {
            "User-Agent":
              "FamilyDashboard/1.0",
            Accept:
              "application/json",
          },
          next: {
            revalidate:
              15 * 60,
          },
        }
      ),
      fetchSunTimes(),
    ]);

  if (!response.ok) {
    throw new Error(
      `MET Norway HTTP ${response.status}`
    );
  }

  const data =
    await response.json();

  const timeseries:
    MetTimeseriesItem[] =
    data?.properties
      ?.timeseries ??
    [];

  if (
    timeseries.length === 0
  ) {
    throw new Error(
      "MET Norway returnerade ingen prognos."
    );
  }

  const current =
    nearestTimeseries(
      timeseries
    );

  const currentInstant =
    current.data
      ?.instant
      ?.details ??
    {};

  const currentPeriod =
    current.data
      ?.next_1_hours ??
    current.data
      ?.next_6_hours;

  const hourly =
    timeseries.slice(
      0,
      48
    );

  const dayMap =
    new Map<
      string,
      {
        temperatures:
          number[];
        uv:
          number[];
        precipitation:
          number[];
        codes:
          number[];
      }
    >();

  for (
    const item of timeseries
  ) {
    const day =
      getStockholmDate(
        item.time
      );

    if (
      !dayMap.has(day)
    ) {
      dayMap.set(day, {
        temperatures:
          [],
        uv: [],
        precipitation:
          [],
        codes: [],
      });
    }

    const bucket =
      dayMap.get(day)!;

    const instant =
      item.data
        ?.instant
        ?.details;

    if (
      typeof instant
        ?.air_temperature ===
      "number"
    ) {
      bucket.temperatures.push(
        instant.air_temperature
      );
    }

    if (
      typeof instant
        ?.ultraviolet_index_clear_sky ===
      "number"
    ) {
      bucket.uv.push(
        instant.ultraviolet_index_clear_sky
      );
    }

    const period =
      item.data
        ?.next_1_hours ??
      item.data
        ?.next_6_hours;

    const amount =
      period?.details
        ?.precipitation_amount;

    if (
      typeof amount ===
      "number"
    ) {
      bucket.precipitation.push(
        amount
      );
    }

    bucket.codes.push(
      symbolToWmoCode(
        period?.summary
          ?.symbol_code
      )
    );
  }

  const days =
    Array.from(
      dayMap.entries()
    ).slice(0, 7);

  const dailyTime =
    days.map(
      ([day]) => day
    );

  const dailyMax =
    days.map(
      ([, values]) =>
        values.temperatures
          .length
          ? Math.max(
              ...values.temperatures
            )
          : 0
    );

  const dailyMin =
    days.map(
      ([, values]) =>
        values.temperatures
          .length
          ? Math.min(
              ...values.temperatures
            )
          : 0
    );

  const dailyUv =
    days.map(
      ([, values]) =>
        values.uv.length
          ? Math.max(
              ...values.uv
            )
          : 0
    );

  const dailyPrecip =
    days.map(
      ([, values]) =>
        values.precipitation.reduce(
          (
            sum,
            value
          ) =>
            sum +
            value,
          0
        )
    );

  const dailyCodes =
    days.map(
      ([, values]) =>
        values.codes[0] ??
        3
    );

  const hourlyTimes =
    hourly.map(
      (item) =>
        item.time
    );

  const hourlyTemps =
    hourly.map(
      (item) =>
        item.data
          ?.instant
          ?.details
          ?.air_temperature ??
        0
    );

  const hourlyWind =
    hourly.map(
      (item) =>
        item.data
          ?.instant
          ?.details
          ?.wind_speed ??
        0
    );

  const hourlyProbability =
    hourly.map(
      (item) => {
        const period =
          item.data
            ?.next_1_hours ??
          item.data
            ?.next_6_hours;

        return (
          period?.details
            ?.probability_of_precipitation ??
          0
        );
      }
    );

  const hourlyCodes =
    hourly.map(
      (item) => {
        const period =
          item.data
            ?.next_1_hours ??
          item.data
            ?.next_6_hours;

        return symbolToWmoCode(
          period?.summary
            ?.symbol_code
        );
      }
    );

  const symbol =
    currentPeriod
      ?.summary
      ?.symbol_code;

  return {
    location:
      "Göteborg",
    temperature:
      currentInstant
        .air_temperature ??
      0,
    apparentTemperature:
      currentInstant
        .air_temperature ??
      0,
    windSpeed:
      currentInstant
        .wind_speed ??
      0,
    humidity:
      currentInstant
        .relative_humidity ??
      0,
    uvIndex:
      currentInstant
        .ultraviolet_index_clear_sky ??
      dailyUv[0] ??
      0,
    precipitation:
      currentPeriod
        ?.details
        ?.precipitation_amount ??
      0,
    weatherCode:
      symbolToWmoCode(
        symbol
      ),
    isDay:
      isDaySymbol(
        symbol
      ),
    sunrise:
      sunTimes.sunrise,
    sunset:
      sunTimes.sunset,
    daily: {
      time:
        dailyTime,
      temperatureMax:
        dailyMax,
      temperatureMin:
        dailyMin,
      weatherCode:
        dailyCodes,
      uvIndexMax:
        dailyUv,
      precipitationSum:
        dailyPrecip,
    },
    hourly: {
      time:
        hourlyTimes,
      temperature:
        hourlyTemps,
      apparentTemperature:
        hourlyTemps,
      precipitationProbability:
        hourlyProbability,
      weatherCode:
        hourlyCodes,
      windSpeed:
        hourlyWind,
    },
  };
}

async function fetchFreshWeather():
  Promise<WeatherData> {
  try {
    return await fetchOpenMeteo();
  } catch (error) {
    console.warn(
      "Open-Meteo kunde inte användas. Växlar till MET Norway.",
      error
    );

    return fetchMetNorway();
  }
}

export async function getWeather():
  Promise<WeatherData> {
  if (
    isFreshCache() &&
    cachedWeather
  ) {
    return cachedWeather;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight =
    fetchFreshWeather();

  try {
    const weather =
      await inFlight;

    cachedWeather =
      weather;

    cachedAt =
      Date.now();

    return weather;
  } catch (error) {
    if (
      canUseStaleCache() &&
      cachedWeather
    ) {
      console.warn(
        "Väderkällorna kunde inte uppdateras. Visar senast cacheade väderdata."
      );

      return cachedWeather;
    }

    console.error(
      "Både Open-Meteo och MET Norway misslyckades:",
      error
    );

    throw new Error(
      "Kunde inte hämta väderdata"
    );
  } finally {
    inFlight = null;
  }
}
