import { NextResponse } from "next/server";
import { getElectricityPrices } from "@/lib/electricity";
import { getWeatherDescription } from "@/lib/weather";

export const dynamic = "force-dynamic";

type Forecast = { time: string; temperature: number; precipitationProbability: number; description: string };

async function loadWeather() {
  const params = new URLSearchParams({
    latitude: "57.7089", longitude: "11.9746", timezone: "Europe/Stockholm",
    current: "temperature_2m,apparent_temperature,weather_code,is_day",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    forecast_days: "2",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 900 }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Vädertjänsten svarade ${response.status}`);
  const data = await response.json() as {
    current?: { time?: string; temperature_2m?: number; apparent_temperature?: number; weather_code?: number; is_day?: number };
    hourly?: { time?: string[]; temperature_2m?: number[]; precipitation_probability?: number[]; weather_code?: number[] };
  };
  if (typeof data.current?.temperature_2m !== "number" || !data.hourly?.time) throw new Error("Väderdata saknas");
  const nowHour = (data.current.time ?? "").slice(0, 13);
  const start = Math.max(0, data.hourly.time.findIndex(time => time.slice(0, 13) >= nowHour));
  const hours: Forecast[] = data.hourly.time.slice(start, start + 6).map((time, index) => {
    const i = start + index;
    return { time: time.slice(11, 16), temperature: data.hourly?.temperature_2m?.[i] ?? 0, precipitationProbability: data.hourly?.precipitation_probability?.[i] ?? 0, description: getWeatherDescription(data.hourly?.weather_code?.[i] ?? -1) };
  });
  return { temperature: data.current.temperature_2m, apparentTemperature: data.current.apparent_temperature ?? null, description: getWeatherDescription(data.current.weather_code ?? -1), isDay: data.current.is_day === 1, hours };
}

export async function GET() {
  const [weather, electricity] = await Promise.allSettled([loadWeather(), getElectricityPrices("SE3")]);
  const prices = electricity.status === "fulfilled" ? electricity.value : null;
  const priceHours = prices?.prices.filter(item => new Date(item.time_end).getTime() > Date.now()).slice(0, 6).map(item => ({
    time: new Date(item.time_start).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" }),
    orePerKwh: Math.round(item.SEK_per_kWh * 1000) / 10,
  })) ?? [];
  return NextResponse.json({
    weather: weather.status === "fulfilled" ? weather.value : null,
    electricity: prices ? {
      area: prices.area,
      currentOrePerKwh: prices.currentPrice ? Math.round(prices.currentPrice.SEK_per_kWh * 1000) / 10 : null,
      averageOrePerKwh: Math.round(prices.averagePrice * 1000) / 10,
      hours: priceHours,
    } : null,
    errors: {
      weather: weather.status === "rejected" ? "Väderdata kunde inte hämtas just nu." : null,
      electricity: electricity.status === "rejected" ? "Elpriser kunde inte hämtas just nu." : null,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
