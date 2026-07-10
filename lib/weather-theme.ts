export type WeatherTheme = {
  background: string;
  glowOne: string;
  glowTwo: string;
  label: string;
};

export function getWeatherTheme(
  weatherCode: number,
  isDay: boolean
): WeatherTheme {
  if (!isDay) {
    return {
      background:
        "bg-[radial-gradient(circle_at_top_left,#172554_0%,#020617_48%,#000000_100%)]",
      glowOne: "bg-indigo-500/20",
      glowTwo: "bg-blue-700/20",
      label: "Natt",
    };
  }

  // Klart eller mestadels klart
  if (weatherCode === 0 || weatherCode === 1) {
    return {
      background:
        "bg-[radial-gradient(circle_at_top_left,#38bdf8_0%,#2563eb_42%,#020617_100%)]",
      glowOne: "bg-yellow-300/25",
      glowTwo: "bg-sky-300/20",
      label: "Klart",
    };
  }

  // Delvis molnigt eller molnigt
  if (weatherCode === 2 || weatherCode === 3) {
    return {
      background:
        "bg-[radial-gradient(circle_at_top_left,#64748b_0%,#1e3a8a_48%,#020617_100%)]",
      glowOne: "bg-slate-300/15",
      glowTwo: "bg-blue-500/15",
      label: "Molnigt",
    };
  }

  // Dimma
  if (weatherCode === 45 || weatherCode === 48) {
    return {
      background:
        "bg-[radial-gradient(circle_at_top_left,#94a3b8_0%,#334155_45%,#020617_100%)]",
      glowOne: "bg-white/10",
      glowTwo: "bg-slate-300/15",
      label: "Dimma",
    };
  }

  // Regn och duggregn
  if (
    (weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82)
  ) {
    return {
      background:
        "bg-[radial-gradient(circle_at_top_left,#0ea5e9_0%,#1e3a8a_42%,#020617_100%)]",
      glowOne: "bg-blue-400/15",
      glowTwo: "bg-cyan-300/10",
      label: "Regn",
    };
  }

  // Snö
  if (
    (weatherCode >= 71 && weatherCode <= 77) ||
    weatherCode === 85 ||
    weatherCode === 86
  ) {
    return {
      background:
        "bg-[radial-gradient(circle_at_top_left,#e0f2fe_0%,#3b82f6_42%,#0f172a_100%)]",
      glowOne: "bg-white/25",
      glowTwo: "bg-cyan-200/20",
      label: "Snö",
    };
  }

  // Åska
  if (weatherCode >= 95 && weatherCode <= 99) {
    return {
      background:
        "bg-[radial-gradient(circle_at_top_left,#581c87_0%,#1e1b4b_42%,#000000_100%)]",
      glowOne: "bg-violet-500/20",
      glowTwo: "bg-blue-700/15",
      label: "Åska",
    };
  }

  return {
    background:
      "bg-[radial-gradient(circle_at_top_left,#1e3a8a_0%,#020617_48%,#020617_100%)]",
    glowOne: "bg-blue-500/15",
    glowTwo: "bg-indigo-500/15",
    label: "Standard",
  };
}