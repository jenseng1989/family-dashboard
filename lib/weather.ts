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
    uvIndexMax: number[];
    precipitationSum: number[];
  };
  hourly: {
    time: string[];
    temperature: number[];
    apparentTemperature: number[];
    precipitationProbability: number[];
    weatherCode: number[];
    windSpeed: number[];
  };
};

export function getWeatherDescription(
  code: number
): string {
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

export function formatWeatherTime(
  dateString: string
): string {
  return new Date(dateString).toLocaleTimeString(
    "sv-SE",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}
