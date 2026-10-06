"use client";

import {
  CalendarDays,
  CalendarCheck2,
  CloudSun,
  Clock3,
  Home,
  Gift,
  Hourglass,
  RefreshCw,
  TriangleAlert,
  Zap,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ElectricityData,
  ElectricityPrice,
  formatHour,
  formatPrice,
} from "@/lib/electricity";
import {
  createUpcomingFamilyEvents,
  type FamilyEvent,
} from "@/lib/family";
import { getFamilyMembersFromDatabase } from "@/lib/family-db";
import { supabase } from "@/lib/supabase";

type GoogleCalendarEvent = {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  allDay: boolean;
  htmlLink: string | null;
};

type GoogleCalendarResponse = {
  connected?: boolean;
  events?: GoogleCalendarEvent[];
  error?: string;
};


type CountdownRow = {
  id: string;
  title: string;
  event_date: string;
  created_at: string;
};

type EverydayWeather = {
  location: string;
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  description: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  precipitationProbability: number;
  windSpeed: number;
  uvIndex: number;
  outdoor: {
    start: string;
    end: string;
    reason: string;
    score: number;
  } | null;
  hourlyForecast: {
    time: string;
    temperature: number;
    precipitationProbability: number;
    weatherCode: number;
  }[];
  updatedAt: string;
};

type ElectricityPeriod = {
  startTime: string;
  endTime: string;
  averagePrice: number;
};

const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";


function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getDaysUntil(value: string): number {
  const today = parseLocalDate(getTodayDateString());
  const date = parseLocalDate(value);

  return Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86_400_000
  );
}

function getDaysLabel(days: number): string {
  if (days === 0) return "Idag";
  if (days === 1) return "Imorgon";
  return `Om ${days} dagar`;
}

function getStockholmDateKey(dateString: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).formatToParts(new Date(dateString));

  const year =
    parts.find((part) => part.type === "year")?.value ?? "";
  const month =
    parts.find((part) => part.type === "month")?.value ?? "";
  const day =
    parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function isMidnightInStockholm(dateString: string): boolean {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).formatToParts(new Date(dateString));

  return (
    parts.find((part) => part.type === "hour")?.value === "00" &&
    parts.find((part) => part.type === "minute")?.value === "00" &&
    parts.find((part) => part.type === "second")?.value === "00"
  );
}

function getEventDateRange(event: GoogleCalendarEvent): {
  startKey: string;
  endKey: string;
  totalDays: number;
} | null {
  if (!event.startTime) return null;

  const startKey = getStockholmDateKey(event.startTime);
  let endKey = event.endTime
    ? getStockholmDateKey(event.endTime)
    : startKey;

  if (event.endTime && event.allDay) {
    endKey = addDaysToDateKey(endKey, -1);
  } else if (
    event.endTime &&
    endKey > startKey &&
    isMidnightInStockholm(event.endTime)
  ) {
    endKey = addDaysToDateKey(endKey, -1);
  }

  if (endKey < startKey) {
    endKey = startKey;
  }

  const start = new Date(`${startKey}T12:00:00Z`);
  const end = new Date(`${endKey}T12:00:00Z`);
  const totalDays =
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  return { startKey, endKey, totalDays };
}

function eventOccursOnDate(
  event: GoogleCalendarEvent,
  key: string
): boolean {
  const range = getEventDateRange(event);
  return Boolean(range && key >= range.startKey && key <= range.endKey);
}

function isCalendarEventActiveNow(
  event: GoogleCalendarEvent,
  now: Date
): boolean {
  const today = getStockholmDateKey(now.toISOString());

  if (!eventOccursOnDate(event, today)) {
    return false;
  }

  if (event.allDay) {
    return true;
  }

  if (!event.startTime) {
    return false;
  }

  const start = new Date(event.startTime).getTime();
  const end = event.endTime
    ? new Date(event.endTime).getTime()
    : Number.POSITIVE_INFINITY;

  return start <= now.getTime() && end > now.getTime();
}

function formatShortCalendarDateKey(key: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).format(new Date(`${key}T12:00:00Z`));
}

function getCalendarEventRangeLabel(
  event: GoogleCalendarEvent,
  today: string
): string | null {
  const range = getEventDateRange(event);

  if (!range || range.totalDays <= 1) {
    return null;
  }

  if (today < range.startKey) {
    return `${formatShortCalendarDateKey(
      range.startKey
    )}–${formatShortCalendarDateKey(range.endKey)} · ${range.totalDays} dagar`;
  }

  const start = new Date(`${range.startKey}T12:00:00Z`);
  const current = new Date(`${today}T12:00:00Z`);
  const dayNumber =
    Math.round((current.getTime() - start.getTime()) / 86_400_000) + 1;

  if (today === range.startKey) {
    if (!event.allDay && event.startTime && event.endTime) {
      return `Startar idag ${formatCalendarTime(
        event.startTime
      )} · ${range.totalDays} dagar · till ${formatShortCalendarDateKey(
        range.endKey
      )} ${formatCalendarTime(event.endTime)}.`;
    }

    return `Startar idag · ${range.totalDays} dagar · till ${formatShortCalendarDateKey(
      range.endKey
    )}.`;
  }

  if (today >= range.startKey && today <= range.endKey) {
    if (!event.allDay && event.endTime) {
      return `Pågår · dag ${dayNumber} av ${range.totalDays} · till ${formatShortCalendarDateKey(
        range.endKey
      )} ${formatCalendarTime(event.endTime)}.`;
    }

    return `Pågår · dag ${dayNumber} av ${range.totalDays} · till ${formatShortCalendarDateKey(
      range.endKey
    )}.`;
  }

  return `${formatShortCalendarDateKey(
    range.startKey
  )}–${formatShortCalendarDateKey(range.endKey)} · ${range.totalDays} dagar`;
}

function formatCalendarTime(dateString: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).format(new Date(dateString));
}

function formatCalendarDate(dateString: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: STOCKHOLM_TIME_ZONE,
  }).format(new Date(dateString));
}

function getGreeting(hour: number): string {
  if (hour < 10) return "God morgon";
  if (hour < 17) return "God dag";
  return "God kväll";
}

function getDayPhase(hour: number) {
  if (hour < 10) {
    return {
      message: "En ny dag har börjat – här är läget just nu.",
      accent: "text-amber-200",
      glow: "bg-amber-300/[0.08]",
      recommendationTitle: "Bra start på dagen",
    };
  }

  if (hour < 17) {
    return {
      message: "Här är det viktigaste för resten av dagen.",
      accent: "text-blue-200",
      glow: "bg-blue-400/10",
      recommendationTitle: "Smart för resten av dagen",
    };
  }

  return {
    message: "Dagen börjar gå mot sitt slut – här är kvällens läge.",
    accent: "text-violet-200",
    glow: "bg-violet-400/[0.10]",
    recommendationTitle: "Bra att veta ikväll",
  };
}

function getCompactWeatherSymbol(
  weatherCode: number
): string {
  if (weatherCode === 0) return "☀️";
  if ([1, 2].includes(weatherCode)) return "🌤️";
  if (weatherCode === 3) return "☁️";
  if ([45, 48].includes(weatherCode)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(weatherCode)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return "🌨️";
  if ([95, 96, 99].includes(weatherCode)) return "⛈️";
  return "🌥️";
}

function getAssistantLead(
  hour: number,
  activeEvents: number,
  nextEvent: GoogleCalendarEvent | null,
  weather: EverydayWeather | null,
  electricity: ElectricityData | null
): {
  eyebrow: string;
  message: string;
} {
  const currentPrice =
    electricity?.currentPrice?.SEK_per_kWh ?? null;
  const averagePrice = electricity?.averagePrice ?? null;

  const electricityIsCheap =
    currentPrice !== null &&
    averagePrice !== null &&
    averagePrice > 0 &&
    currentPrice / averagePrice <= 0.7;

  const electricityIsExpensive =
    currentPrice !== null &&
    averagePrice !== null &&
    averagePrice > 0 &&
    currentPrice / averagePrice >= 1.4;

  const rainy =
    (weather?.precipitationProbability ?? 0) >= 60;

  if (activeEvents > 0) {
    return {
      eyebrow: "Just nu",
      message:
        "Pågående aktivitet i kalendern",
    };
  }

  if (hour < 10) {
    if (rainy) {
      return {
        eyebrow: "Morgonläge",
        message:
          "Det finns tydlig regnrisk idag. Kolla bästa utetiden innan dagen drar igång.",
      };
    }

    if (nextEvent) {
      return {
        eyebrow: "Morgonläge",
        message:
          "Nästa kalenderpunkt och dagens bästa vardagslägen är prioriterade nedan.",
      };
    }

    return {
      eyebrow: "Morgonläge",
      message:
        "Inget brådskande syns i kalendern. Väder och smart elanvändning får ta plats istället.",
    };
  }

  if (hour < 17) {
    if (nextEvent) {
      return {
        eyebrow: "Dagsläge",
        message:
          "Assistenten håller nästa kalenderpunkt överst och väger den mot väder, el och familjehändelser.",
      };
    }

    if (electricityIsCheap) {
      return {
        eyebrow: "Dagsläge",
        message:
          "Elpriset är lågt jämfört med dagens snitt. Resten av dagens viktigaste saker finns direkt under.",
      };
    }

    if (electricityIsExpensive) {
      return {
        eyebrow: "Dagsläge",
        message:
          "Elpriset ligger högt jämfört med dagens snitt. Ett billigare tidsfönster kan finnas senare.",
      };
    }

    return {
      eyebrow: "Dagsläge",
      message:
        "Inget enskilt sticker ut kraftigt just nu, så assistenten visar de mest relevanta vardagssignalerna.",
    };
  }

  if (hour < 21) {
    if (nextEvent) {
      return {
        eyebrow: "Kvällsläge",
        message:
          "Kvällen är inte riktigt klar ännu. Nästa kalenderpunkt prioriteras innan morgondagens överblick.",
      };
    }

    return {
      eyebrow: "Kvällsläge",
      message:
        "Det viktigaste som återstår visas först. Därefter får du en snabb blick på morgondagen.",
    };
  }

  return {
    eyebrow: "Inför imorgon",
    message:
      "Dagens aktiviteter är i stort sett klara. Morgondagens kalender och kommande familjehändelser blir viktigare nu.",
  };
}

function getRelativeTime(event: GoogleCalendarEvent, now: Date): string {
  if (event.allDay) return "Hela dagen";

  if (!event.startTime) return "";

  const diffMs = new Date(event.startTime).getTime() - now.getTime();

  if (diffMs <= 0) return "Pågår nu";

  const totalMinutes = Math.max(1, Math.round(diffMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `Om ${minutes} min`;
  if (minutes === 0) return `Om ${hours} h`;

  return `Om ${hours} h ${minutes} min`;
}

function getEventTime(event: GoogleCalendarEvent): string {
  if (event.allDay) return "Hela dagen";
  if (!event.startTime) return "";

  const start = formatCalendarTime(event.startTime);

  if (!event.endTime) return start;

  return `${start}–${formatCalendarTime(event.endTime)}`;
}

function findCheapestPeriod(
  prices: ElectricityPrice[],
  entries: number
): ElectricityPeriod | null {
  if (prices.length < entries || entries < 1) return null;

  let cheapest: ElectricityPeriod | null = null;

  for (let index = 0; index <= prices.length - entries; index += 1) {
    const period = prices.slice(index, index + entries);
    const averagePrice =
      period.reduce((sum, price) => sum + price.SEK_per_kWh, 0) /
      period.length;

    if (!cheapest || averagePrice < cheapest.averagePrice) {
      cheapest = {
        startTime: period[0].time_start,
        endTime: period[period.length - 1].time_end,
        averagePrice,
      };
    }
  }

  return cheapest;
}

function getElectricityAdvice(
  electricity: ElectricityData | null,
  now: Date | null
): {
  title: string;
  description: string;
} {
  if (!electricity || !now) {
    return {
      title: "Elpris",
      description: "Elpriset kunde inte hämtas just nu.",
    };
  }

  const remaining = electricity.prices.filter(
    (price) => new Date(price.time_end).getTime() > now.getTime()
  );

  const threeHourPeriod = findCheapestPeriod(remaining, 3);
  const oneHourPeriod = findCheapestPeriod(remaining, 1);
  const period = threeHourPeriod ?? oneHourPeriod;

  if (!period) {
    return {
      title: "Dagens elpris",
      description: `Dagens snitt är ${formatPrice(
        electricity.averagePrice
      )} kr/kWh.`,
    };
  }

  const durationLabel = threeHourPeriod ? "3 timmar" : "timmen";

  return {
    title: `${formatHour(period.startTime)}–${formatHour(period.endTime)}`,
    description: `Bästa ${durationLabel} som återstår · cirka ${formatPrice(
      period.averagePrice
    )} kr/kWh.`,
  };
}

type SchoolTransfer = {
  id: string;
  kind: "dropoff" | "pickup";
  person: string;
  time: string;
};

function getSchoolTransfer(
  event: GoogleCalendarEvent
): Omit<SchoolTransfer, "id" | "time"> | null {
  const match = event.title
    .trim()
    .match(/^(hämtning|lämning)\s*[-–]\s*(.+)$/i);

  if (!match) return null;

  return {
    kind:
      match[1].toLocaleLowerCase("sv-SE") === "hämtning"
        ? "pickup"
        : "dropoff",
    person: match[2].trim(),
  };
}

export default function DailyAssistantWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<
    GoogleCalendarEvent[]
  >([]);
  const [schoolCalendarEvents, setSchoolCalendarEvents] = useState<
    GoogleCalendarEvent[]
  >([]);
  const [countdowns, setCountdowns] = useState<CountdownRow[]>([]);
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([]);
  const [weather, setWeather] = useState<EverydayWeather | null>(null);
  const [electricity, setElectricity] =
    useState<ElectricityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPartialError, setHasPartialError] = useState(false);

  // En äldre hämtning får inte skriva över en nyare uppdatering.
  // Ökas även när komponenten avmonteras.
  const requestIdRef = useRef(0);

  const loadData = useCallback(
    async (showLoader = true, forceRefresh = false) => {
      const requestId = ++requestIdRef.current;
      const isCurrent = () => requestIdRef.current === requestId;

      if (showLoader) setIsLoading(true);
      setHasPartialError(false);

      // Varje källa behandlas direkt när den är klar. Ett fel i en
      // källa hindrar inte de andra från att uppdatera sin del.
      const calendarTask = (async () => {
        try {
          const response = await fetch("/api/google-calendar", {
            cache: "no-store",
          });
          if (!response.ok) {
            throw new Error(`Google Kalender svarade ${response.status}.`);
          }

          const data =
            (await response.json()) as GoogleCalendarResponse;
          if (data.connected !== true) {
            throw new Error(data.error ?? "Google Kalender är inte ansluten.");
          }

          if (isCurrent()) setCalendarEvents(data.events ?? []);
        } catch (error) {
          console.error("Idag: kunde inte hämta Google Kalender:", error);
          if (isCurrent()) {
            setCalendarEvents([]);
            setHasPartialError(true);
          }
        }
      })();

      const schoolCalendarTask = (async () => {
        try {
          const response = await fetch("/api/google-school-calendar", {
            cache: "no-store",
          });
          if (!response.ok) {
            throw new Error(
              `Google Skolkalender svarade ${response.status}.`
            );
          }

          const data =
            (await response.json()) as GoogleCalendarResponse;
          if (data.connected !== true) {
            throw new Error(
              data.error ?? "Google Skolkalender är inte ansluten."
            );
          }

          if (isCurrent()) {
            setSchoolCalendarEvents(data.events ?? []);
          }
        } catch (error) {
          console.error(
            "Idag: kunde inte hämta Google Skolkalender:",
            error
          );
          if (isCurrent()) {
            setSchoolCalendarEvents([]);
            setHasPartialError(true);
          }
        }
      })();

      const countdownTask = (async () => {
        try {
          const result = await supabase
            .from("countdowns")
            .select("id, title, event_date, created_at")
            .gte("event_date", getTodayDateString())
            .order("event_date", { ascending: true })
            .order("created_at", { ascending: true });

          if (result.error) throw result.error;
          if (isCurrent()) {
            setCountdowns((result.data ?? []) as CountdownRow[]);
          }
        } catch (error) {
          console.error("Idag: kunde inte hämta nedräkningar:", error);
          if (isCurrent()) {
            setCountdowns([]);
            setHasPartialError(true);
          }
        }
      })();

      const familyTask = (async () => {
        try {
          const members = await getFamilyMembersFromDatabase();
          const events = createUpcomingFamilyEvents(members);
          if (isCurrent()) setFamilyEvents(events);
        } catch (error) {
          console.error("Idag: kunde inte hämta familjehändelser:", error);
          if (isCurrent()) {
            setFamilyEvents([]);
            setHasPartialError(true);
          }
        }
      })();

      const weatherTask = (async () => {
        try {
          const response = await fetch(
            "/api/everyday-weather",
            forceRefresh ? { cache: "reload" } : undefined
          );
          if (!response.ok) {
            throw new Error(`Väder-API svarade ${response.status}.`);
          }
          const data = (await response.json()) as EverydayWeather;
          if (isCurrent()) setWeather(data);
        } catch (error) {
          console.error("Idag: kunde inte hämta väder:", error);
          if (isCurrent()) {
            setWeather(null);
            setHasPartialError(true);
          }
        }
      })();

      const electricityTask = (async () => {
        try {
          const response = await fetch(
            "/api/electricity",
            forceRefresh ? { cache: "reload" } : undefined
          );
          if (!response.ok) {
            throw new Error(`Elpris-API svarade ${response.status}.`);
          }
          const data = (await response.json()) as ElectricityData;
          if (!Array.isArray(data.prices)) {
            throw new Error("Elpris-API returnerade ogiltiga priser.");
          }
          if (isCurrent()) setElectricity(data);
        } catch (error) {
          console.error("Idag: kunde inte hämta elpriser:", error);
          if (isCurrent()) {
            setElectricity(null);
            setHasPartialError(true);
          }
        }
      })();

      // Laddningsindikatorn och uppdateringsknappen återställs
      // när samtliga källor har avslutats, precis som tidigare.
      await Promise.all([
        calendarTask,
        schoolCalendarTask,
        countdownTask,
        familyTask,
        weatherTask,
        electricityTask,
      ]);

      if (isCurrent()) setIsLoading(false);
    },
    []
  );

  useEffect(() => {
    void loadData();

    const refreshId = window.setInterval(() => {
      void loadData(false);
    }, 15 * 60 * 1000);

    return () => {
      window.clearInterval(refreshId);
      requestIdRef.current += 1;
    };
  }, [loadData]);

  useEffect(() => {
    setNow(new Date());

    const clockId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(clockId);
  }, []);

  const nextFamilyEvent = useMemo(
    () =>
      familyEvents.find((event) => event.daysUntil >= 0) ?? null,
    [familyEvents]
  );

  const nextCountdown = countdowns[0] ?? null;

  const todaysCalendarEvents = useMemo(() => {
    if (!now) return [];

    const today = getStockholmDateKey(now.toISOString());

    return calendarEvents.filter((event) =>
      eventOccursOnDate(event, today)
    );
  }, [calendarEvents, now]);

  const activeCalendarEvents = useMemo(() => {
    if (!now) return [];

    return todaysCalendarEvents.filter((event) =>
      isCalendarEventActiveNow(event, now)
    );
  }, [todaysCalendarEvents, now]);

  const nextCalendarEvent = useMemo(() => {
    if (!now) return null;

    return (
      todaysCalendarEvents.find((event) => {
        if (isCalendarEventActiveNow(event, now)) return false;
        if (event.allDay) return false;
        if (!event.startTime) return false;

        return new Date(event.startTime).getTime() > now.getTime();
      }) ?? null
    );
  }, [todaysCalendarEvents, now]);

  const nextUpcomingEvent = useMemo(() => {
    if (!now) return null;

    const today = getStockholmDateKey(now.toISOString());

    return (
      calendarEvents.find((event) => {
        const range = getEventDateRange(event);
        if (!range) return false;

        if (range.endKey < today) return false;

        if (eventOccursOnDate(event, today)) {
          if (isCalendarEventActiveNow(event, now)) return false;
          if (!event.startTime) return false;
          return new Date(event.startTime).getTime() > now.getTime();
        }

        return range.startKey > today;
      }) ?? null
    );
  }, [calendarEvents, now]);

  const calendarHeroEvents = useMemo(() => {
    if (activeCalendarEvents.length > 0) {
      return activeCalendarEvents;
    }

    const next = nextCalendarEvent ?? nextUpcomingEvent;
    return next ? [next] : [];
  }, [activeCalendarEvents, nextCalendarEvent, nextUpcomingEvent]);

  const calendarTodayKey = now
    ? getStockholmDateKey(now.toISOString())
    : "";

  const calendarHeroIds = useMemo(
    () => new Set(calendarHeroEvents.map((event) => event.id)),
    [calendarHeroEvents]
  );

  const remainingTodayEvents = useMemo(() => {
    if (!now) return [];

    return todaysCalendarEvents.filter((event) => {
      if (calendarHeroIds.has(event.id)) return false;
      if (event.allDay) return true;
      if (!event.endTime) return true;

      return new Date(event.endTime).getTime() > now.getTime();
    });
  }, [calendarHeroIds, now, todaysCalendarEvents]);

  const todaysSchoolTransfers = useMemo(() => {
    if (!now) {
      return { dropoffs: [] as SchoolTransfer[], pickups: [] as SchoolTransfer[] };
    }

    const today = getStockholmDateKey(now.toISOString());
    const transfers = schoolCalendarEvents
      .filter((event) => eventOccursOnDate(event, today))
      .map((event) => {
        const transfer = getSchoolTransfer(event);
        if (!transfer) return null;

        return {
          id: event.id,
          ...transfer,
          time: event.allDay
            ? "Hela dagen"
            : event.startTime
              ? formatCalendarTime(event.startTime)
              : "Tid saknas",
        };
      })
      .filter((transfer): transfer is SchoolTransfer => transfer !== null);

    return {
      dropoffs: transfers.filter((transfer) => transfer.kind === "dropoff"),
      pickups: transfers.filter((transfer) => transfer.kind === "pickup"),
    };
  }, [now, schoolCalendarEvents]);

  const electricityAdvice = useMemo(
    () => getElectricityAdvice(electricity, now),
    [electricity, now]
  );

  const dayPhase = now ? getDayPhase(now.getHours()) : null;

  const assistantLead = useMemo(
    () =>
      now
        ? getAssistantLead(
            now.getHours(),
            activeCalendarEvents.length,
            nextCalendarEvent ?? nextUpcomingEvent,
            weather,
            electricity
          )
        : null,
    [
      activeCalendarEvents.length,
      electricity,
      nextCalendarEvent,
      nextUpcomingEvent,
      now,
      weather,
    ]
  );

  const electricitySummary = electricity?.currentPrice
    ? `${formatPrice(electricity.currentPrice.SEK_per_kWh)} kr/kWh`
    : "Pris saknas";

  const tomorrowCalendarEvents = useMemo(() => {
    if (!now) return [];

    const todayKey = getStockholmDateKey(now.toISOString());
    const tomorrowKey = addDaysToDateKey(todayKey, 1);

    return calendarEvents.filter((event) =>
      eventOccursOnDate(event, tomorrowKey)
    );
  }, [calendarEvents, now]);

  const tomorrowFirstEvent =
    tomorrowCalendarEvents[0] ?? null;

  /*
   * M2: dynamisk prioritering.
   *
   * Vi skapar fler möjliga vardagssignaler än vad som får plats
   * och poängsätter dem utifrån hur tidskritiska/relevanta de är.
   * Endast de tre högst prioriterade visas i huvudytan.
   *
   * Originalet EverydayOverview.tsx påverkas fortfarande inte.
   */
  const assistantItems = useMemo(() => {
    type AssistantItem = {
      id: string;
      label: string;
      title: string;
      description: string;
      icon: ReactNode;
      iconClass: string;
      labelClass: string;
      priority: number;
    };

    const items: AssistantItem[] = [];

    const calendarEvent = calendarHeroEvents[0] ?? null;

    if (calendarEvent) {
      let priority = 72;

      if (activeCalendarEvents.length > 0) {
        priority = 100;
      } else if (
        now &&
        calendarEvent.startTime
      ) {
        const minutesUntil =
          (new Date(calendarEvent.startTime).getTime() -
            now.getTime()) /
          60_000;

        if (minutesUntil >= 0 && minutesUntil <= 60) {
          priority = 96;
        } else if (minutesUntil <= 120) {
          priority = 90;
        } else if (minutesUntil <= 240) {
          priority = 82;
        }
      }

      items.push({
        id: "calendar",
        label:
          activeCalendarEvents.length > 0
            ? "Pågår just nu"
            : "Nästa i kalendern",
        title: calendarEvent.title,
        description:
          calendarTodayKey &&
          eventOccursOnDate(
            calendarEvent,
            calendarTodayKey
          )
            ? getEventTime(calendarEvent)
            : calendarEvent.startTime
              ? `${formatCalendarDate(
                  calendarEvent.startTime
                )} · ${getEventTime(calendarEvent)}`
              : "Kommande kalenderhändelse",
        icon: <CalendarCheck2 size={19} />,
        iconClass:
          "border-red-300/15 bg-red-400/[0.08] text-red-300",
        labelClass: "text-red-300",
        priority,
      });
    }

    if (weather) {
      const rainProbability =
        weather.precipitationProbability;

      if (rainProbability >= 60) {
        items.push({
          id: "rain",
          label: "Vädret kräver koll",
          title: `${Math.round(rainProbability)}% risk för regn`,
          description: `${weather.description} · ${Math.round(
            weather.temperature
          )}° just nu.`,
          icon: <CloudSun size={19} />,
          iconClass:
            "border-sky-300/15 bg-sky-400/[0.08] text-sky-300",
          labelClass: "text-sky-300",
          priority:
            rainProbability >= 80 ? 92 : 84,
        });
      }

      if (weather.outdoor) {
        items.push({
          id: "outdoor",
          label: "Bäst ute",
          title: `${weather.outdoor.start}–${weather.outdoor.end}`,
          description: weather.outdoor.reason,
          icon: <CloudSun size={19} />,
          iconClass:
            "border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-300",
          labelClass: "text-emerald-300",
          priority:
            rainProbability >= 60 ? 62 : 76,
        });
      }
    }

    if (electricity) {
      const current =
        electricity.currentPrice?.SEK_per_kWh ?? null;
      const average = electricity.averagePrice;

      let priority = 64;
      let label = "Smart elanvändning";

      if (
        current !== null &&
        average > 0
      ) {
        const ratio = current / average;

        if (ratio <= 0.7) {
          priority = 86;
          label = "Billig el just nu";
        } else if (ratio >= 1.4) {
          priority = 88;
          label = "Dyr el just nu";
        }
      }

      items.push({
        id: "electricity",
        label,
        title: electricityAdvice.title,
        description: electricityAdvice.description,
        icon: <Zap size={19} />,
        iconClass:
          "border-amber-300/15 bg-amber-400/[0.08] text-amber-300",
        labelClass: "text-amber-300",
        priority,
      });
    }

    if (
      nextFamilyEvent &&
      nextFamilyEvent.daysUntil <= 7
    ) {
      items.push({
        id: "family",
        label: "Familjehändelse",
        title: nextFamilyEvent.title,
        description: getDaysLabel(
          nextFamilyEvent.daysUntil
        ),
        icon: <Gift size={19} />,
        iconClass:
          "border-fuchsia-300/15 bg-fuchsia-400/[0.08] text-fuchsia-300",
        labelClass: "text-fuchsia-300",
        priority:
          nextFamilyEvent.daysUntil === 0
            ? 94
            : nextFamilyEvent.daysUntil === 1
              ? 88
              : 68,
      });
    }

    if (nextCountdown) {
      const daysUntil =
        getDaysUntil(nextCountdown.event_date);

      if (daysUntil >= 0 && daysUntil <= 7) {
        items.push({
          id: "countdown",
          label: "Nedräkning",
          title: nextCountdown.title,
          description: getDaysLabel(daysUntil),
          icon: <Hourglass size={19} />,
          iconClass:
            "border-cyan-300/15 bg-cyan-400/[0.08] text-cyan-300",
          labelClass: "text-cyan-300",
          priority:
            daysUntil === 0
              ? 93
              : daysUntil === 1
                ? 87
                : 66,
        });
      }
    }

    if (items.length === 0) {
      items.push({
        id: "quiet",
        label: "Lugnt läge",
        title: "Inget brådskande just nu",
        description:
          "Dagen ser lugn ut utifrån kalender, väder och övrig vardagsdata.",
        icon: <Home size={19} />,
        iconClass:
          "border-blue-300/15 bg-blue-400/[0.08] text-blue-300",
        labelClass: "text-blue-300",
        priority: 1,
      });
    }

    return items
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }, [
    activeCalendarEvents.length,
    calendarHeroEvents,
    calendarTodayKey,
    electricity,
    electricityAdvice.description,
    electricityAdvice.title,
    nextCountdown,
    nextFamilyEvent,
    now,
    weather,
  ]);

  return (
    <div className="grid w-full min-w-0 grid-cols-12 gap-4 sm:gap-5">
      <section className="relative col-span-12 min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/40 p-4 shadow-xl shadow-black/10 sm:p-6 lg:p-7">
        <div
          className={[
            "pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full blur-3xl transition-colors duration-700",
            dayPhase?.glow ?? "bg-blue-400/10",
          ].join(" ")}
        />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-violet-400/[0.08] blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-blue-300">
                <Home size={18} />
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                  {assistantLead?.eyebrow ?? "Vardagsassistent"}
                </p>
              </div>

              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {now ? getGreeting(now.getHours()) : "Hej"}
              </h2>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300 sm:text-base">
                {assistantLead?.message ??
                  "Jag sammanställer det viktigaste för dagen."}
              </p>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                <span className="flex items-center gap-2 capitalize">
                  <CalendarDays size={16} />
                  {now
                    ? now.toLocaleDateString("sv-SE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })
                    : "Laddar datum…"}
                </span>

                <span className="flex items-center gap-2">
                  <Clock3 size={16} />
                  {now
                    ? now.toLocaleTimeString("sv-SE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadData(true, true)}
              disabled={isLoading}
              className="flex w-auto shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:opacity-50 sm:px-4 sm:py-2.5"
            >
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
              Uppdatera
            </button>
          </div>

          {hasPartialError && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.06] p-4">
              <TriangleAlert
                size={18}
                className="mt-0.5 shrink-0 text-amber-300"
              />
              <p className="text-sm text-amber-100/80">
                Någon del av dagens information kunde inte hämtas.
                Resten av sammanfattningen visas som vanligt.
              </p>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-blue-300/10 bg-blue-400/[0.055] p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
              Prioriterat just nu
            </p>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {assistantItems.map((item) => (
                <article
                  key={item.id}
                  className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/25 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                        item.iconClass,
                      ].join(" ")}
                    >
                      {item.icon}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={[
                          "text-xs font-semibold uppercase tracking-[0.13em]",
                          item.labelClass,
                        ].join(" ")}
                      >
                        {item.label}
                      </p>
                      <p className="mt-1 font-bold text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {weather && (
            <article className="mt-4 min-w-0 rounded-2xl border border-sky-300/10 bg-sky-400/[0.04] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex shrink-0 items-center gap-3 sm:min-w-[190px]">
                  <span
                    className="text-2xl"
                    aria-hidden="true"
                  >
                    {getCompactWeatherSymbol(
                      weather.weatherCode
                    )}
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.13em] text-sky-300">
                      Vädret nu
                    </p>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-white">
                        {Math.round(
                          weather.temperature
                        )}
                        °
                      </span>
                      <span className="truncate text-sm text-slate-400">
                        {weather.description}
                      </span>
                    </div>
                  </div>
                </div>

                {weather.hourlyForecast.length > 0 && (
                  <div className="grid min-w-0 flex-1 grid-cols-5 gap-1.5">
                    {weather.hourlyForecast.map(
                      (hour) => (
                        <div
                          key={hour.time}
                          className="min-w-0 rounded-xl border border-white/[0.07] bg-slate-950/20 px-1.5 py-2 text-center"
                        >
                          <p className="text-[10px] font-semibold text-slate-500">
                            {new Date(
                              hour.time
                            ).toLocaleTimeString(
                              "sv-SE",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                          <p
                            className="mt-0.5 text-base leading-none"
                            aria-hidden="true"
                          >
                            {getCompactWeatherSymbol(
                              hour.weatherCode
                            )}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-200">
                            {Math.round(
                              hour.temperature
                            )}
                            °
                          </p>
                          {hour.precipitationProbability >
                            0 && (
                            <p className="mt-0.5 text-[10px] text-sky-300/80">
                              {Math.round(
                                hour.precipitationProbability
                              )}
                              %
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </article>
          )}

          {(todaysSchoolTransfers.dropoffs.length > 0 ||
            todaysSchoolTransfers.pickups.length > 0) && (
            <article className="mt-4 rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.045] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-300">
                  <CalendarCheck2 size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.13em] text-emerald-300">
                    Förskola idag
                  </p>

                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Lämning
                      </p>
                      {todaysSchoolTransfers.dropoffs.length > 0 ? (
                        todaysSchoolTransfers.dropoffs.map((transfer) => (
                          <p
                            key={transfer.id}
                            className="mt-0.5 text-sm font-semibold text-slate-200"
                          >
                            {transfer.person} · {transfer.time}
                          </p>
                        ))
                      ) : (
                        <p className="mt-0.5 text-sm text-slate-500">
                          Ingen lämning inlagd
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Hämtning
                      </p>
                      {todaysSchoolTransfers.pickups.length > 0 ? (
                        todaysSchoolTransfers.pickups.map((transfer) => (
                          <p
                            key={transfer.id}
                            className="mt-0.5 text-sm font-semibold text-slate-200"
                          >
                            {transfer.person} · {transfer.time}
                          </p>
                        ))
                      ) : (
                        <p className="mt-0.5 text-sm text-slate-500">
                          Ingen hämtning inlagd
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )}

          <article
            className={[
              "mt-4 min-w-0 rounded-2xl border p-4 transition-colors sm:p-5",
              now && now.getHours() >= 21
                ? "border-violet-300/20 bg-violet-400/[0.085]"
                : "border-violet-300/10 bg-violet-400/[0.045]",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/[0.08] text-violet-300">
                <CalendarDays size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-violet-300">
                  Blick mot imorgon
                </p>

                {tomorrowCalendarEvents.length > 0 ? (
                  <>
                    <p className="mt-1 font-bold text-white">
                      {tomorrowCalendarEvents.length === 1
                        ? "1 kalenderhändelse"
                        : `${tomorrowCalendarEvents.length} kalenderhändelser`}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-400">
                      Först: {tomorrowFirstEvent?.title}
                      {tomorrowFirstEvent
                        ? ` · ${getEventTime(tomorrowFirstEvent)}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 font-bold text-white">
                      Kalendern ser lugn ut
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-400">
                      Inga kalenderhändelser är planerade för imorgon.
                    </p>
                  </>
                )}

                {(nextFamilyEvent?.daysUntil === 1 ||
                  (nextCountdown &&
                    getDaysUntil(nextCountdown.event_date) === 1)) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {nextFamilyEvent?.daysUntil === 1 && (
                      <span className="rounded-full border border-fuchsia-300/15 bg-fuchsia-400/[0.07] px-3 py-1.5 text-xs font-semibold text-fuchsia-200">
                        🎁 {nextFamilyEvent.title}
                      </span>
                    )}

                    {nextCountdown &&
                      getDaysUntil(nextCountdown.event_date) === 1 && (
                        <span className="rounded-full border border-cyan-300/15 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-semibold text-cyan-200">
                          ⏳ {nextCountdown.title}
                        </span>
                      )}
                  </div>
                )}
              </div>
            </div>
          </article>

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Kommande
            </p>

            <div className="grid gap-3 md:grid-cols-2">
            <div className="flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-fuchsia-300/15 bg-fuchsia-400/[0.08] text-fuchsia-300">
                  <Gift size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.13em] text-fuchsia-300">
                    Familjen
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-200">
                    {nextFamilyEvent?.title ??
                      "Ingen kommande familjehändelse"}
                  </p>
                </div>
              </div>

              {nextFamilyEvent && (
                <span className="shrink-0 whitespace-nowrap text-sm font-bold text-white">
                  {getDaysLabel(nextFamilyEvent.daysUntil)}
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-400/[0.08] text-cyan-300">
                  <Hourglass size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.13em] text-cyan-300">
                    Nedräkning
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-200">
                    {nextCountdown?.title ??
                      "Ingen aktiv nedräkning"}
                  </p>
                </div>
              </div>

              {nextCountdown && (
                <span className="shrink-0 whitespace-nowrap text-sm font-bold text-white">
                  {getDaysLabel(
                    getDaysUntil(
                      nextCountdown.event_date
                    )
                  )}
                </span>
              )}
            </div>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Vardagsassistenten prioriterar automatiskt kalender, väder,
            elpris och familjehändelser utifrån vad som är relevant just nu.
          </p>
        </div>
      </section>
    </div>
  );
}
