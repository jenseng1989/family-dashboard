import Dashboard from "@/components/dashboard/Dashboard";
import Header from "@/components/layout/Header";
import { getWeather } from "@/lib/weather";
import { getWeatherTheme } from "@/lib/weather-theme";

export default async function Home() {
  const weather = await getWeather();

  const theme = getWeatherTheme(
    weather.weatherCode,
    weather.isDay
  );

  return (
    <main
      className={`relative min-h-screen overflow-hidden text-white transition-colors duration-1000 ${theme.background}`}
    >
      {/* Dekorativa ljuseffekter i bakgrunden */}
      <div
        className={`pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl ${theme.glowOne}`}
      />

      <div
        className={`pointer-events-none absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full blur-3xl ${theme.glowTwo}`}
      />

      {/* Diskret mörk ton som förbättrar läsbarheten */}
      <div className="pointer-events-none absolute inset-0 bg-slate-950/15" />

      {/* Sidans innehåll */}
      <div className="relative z-10 mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
        <Header />
        <Dashboard />
      </div>
    </main>
  );
}