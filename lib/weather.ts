export type WeatherData = {
  location: string;
  temperature: number;
  apparentTemperature: number;
  windSpeed: number;
  humidity: number;
  uvIndex: number;
  precipitation: number;
  weatherCode: number;
  isDay: boolean;
  sunrise: string;
  sunset: string;
  daily: {
    time: string[];
    temperatureMax: number[];
    temperatureMin: number[];
    weatherCode: number[];
  };
};

export async function getWeather(): Promise<WeatherData> {
  const latitude = 57.7089;
  const longitude = 11.9746;

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum" +
    "&timezone=auto";

  const response = await fetch(url, {
    next: {
      revalidate: 900,
    },
  });

  if (!response.ok) {
    throw new Error("Kunde inte hämta väderdata");
  }

  const data = await response.json();

  return {
    location: "Göteborg",
    temperature: data.current.temperature_2m,
    apparentTemperature: data.current.apparent_temperature,
    windSpeed: data.current.wind_speed_10m,
    humidity: data.current.relative_humidity_2m,
    precipitation: data.current.precipitation,
    weatherCode: data.current.weather_code,
    isDay: data.current.is_day === 1,
    sunrise: data.daily.sunrise[0],
    sunset: data.daily.sunset[0],
    uvIndex: data.daily.uv_index_max[0],
    daily: {
      time: data.daily.time,
      temperatureMax: data.daily.temperature_2m_max,
      temperatureMin: data.daily.temperature_2m_min,
      weatherCode: data.daily.weather_code,
    },
  };
}

export function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "Klart",
    1: "Mestadels klart",
    2: "Delvis molnigt",
    3: "Molnigt",
    45: "Dimma",
    48: "Rimfrostdimma",
    51: "Lätt duggregn",
    53: "Duggregn",
    55: "Kraftigt duggregn",
    56: "Lätt underkylt duggregn",
    57: "Kraftigt underkylt duggregn",
    61: "Lätt regn",
    63: "Regn",
    65: "Kraftigt regn",
    66: "Lätt underkylt regn",
    67: "Kraftigt underkylt regn",
    71: "Lätt snöfall",
    73: "Snöfall",
    75: "Kraftigt snöfall",
    77: "Snökorn",
    80: "Lätta regnskurar",
    81: "Regnskurar",
    82: "Kraftiga regnskurar",
    85: "Lätta snöbyar",
    86: "Kraftiga snöbyar",
    95: "Åska",
    96: "Åska med lätt hagel",
    99: "Åska med kraftigt hagel",
  };

  return descriptions[code] ?? "Okänt väder";
}

export function formatWeatherTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}