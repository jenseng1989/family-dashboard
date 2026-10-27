"use client";
import { useClientClock } from "@/lib/hooks/use-client-clock";

import {
  CalendarDays,
  CalendarCheck2,
  Compass,
  CloudSun,
  Clock3,
  Gift,
  Hourglass,
  RefreshCw,
  TriangleAlert,
  Zap,
  ArrowUpRight, ShoppingCart, Users, MapPin, Wind, Droplets, Sun,
} from "lucide-react";
import {
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
  const now = useClientClock();
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
  type DataSource = "calendar" | "school" | "countdowns" | "family" | "weather" | "electricity";
  const [sourceErrors, setSourceErrors] = useState<Partial<Record<DataSource, boolean>>>({});
  const updateSourceError = useCallback((source: DataSource, failed: boolean) => {
    setSourceErrors(previous => ({ ...previous, [source]: failed }));
  }, []);
  const hasPartialError = Object.values(sourceErrors).some(Boolean);
  // Sparar vilka källor som faktiskt har levererat data under denna session.
  // Även ett lyckat svar med en tom lista räknas som lyckat.
  const successfulSourcesRef = useRef<Set<DataSource>>(new Set());
  const [hasPreviousData, setHasPreviousData] = useState<Partial<Record<DataSource, boolean>>>({});
  const markSuccessful = useCallback((source: DataSource) => {
    successfulSourcesRef.current.add(source);
    setHasPreviousData(previous => previous[source] ? previous : { ...previous, [source]: true });
    updateSourceError(source, false);
  }, [updateSourceError]);

  // En äldre hämtning får inte skriva över en nyare uppdatering.
  // Ökas även när komponenten avmonteras.
  const requestIdRef = useRef(0);
  const lastFetchAtRef = useRef(0);

  const fetchData = useCallback((forceRefresh = false) => {
    lastFetchAtRef.current = Date.now();
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestIdRef.current === requestId;

    // Varje källa behandlas direkt när den är klar. Ett fel i en
    // källa hindrar inte de andra från att uppdatera sin del.
    const calendarTask = fetch("/api/google-calendar", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Google Kalender svarade ${response.status}.`);
        }
        const data = (await response.json()) as GoogleCalendarResponse;
        if (data.connected !== true) {
          throw new Error(data.error ?? "Google Kalender är inte ansluten.");
        }
        if (isCurrent()) { markSuccessful("calendar"); setCalendarEvents(data.events ?? []); }
      })
      .catch((error) => {
        console.error("Idag: kunde inte hämta Google Kalender:", error);
        if (isCurrent()) {
          updateSourceError("calendar", true);
        }
      });

    const schoolCalendarTask = fetch("/api/google-school-calendar", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Google Skolkalender svarade ${response.status}.`);
        }
        const data = (await response.json()) as GoogleCalendarResponse;
        if (data.connected !== true) {
          throw new Error(data.error ?? "Google Skolkalender är inte ansluten.");
        }
        if (isCurrent()) {
          setSchoolCalendarEvents(data.events ?? []);
          markSuccessful("school");
        }
      })
      .catch((error) => {
        console.error("Idag: kunde inte hämta Google Skolkalender:", error);
        if (isCurrent()) {
          updateSourceError("school", true);
        }
      });

    const countdownTask = Promise.resolve(
      supabase
        .from("countdowns")
        .select("id, title, event_date, created_at")
        .gte("event_date", getTodayDateString())
        .order("event_date", { ascending: true })
        .order("created_at", { ascending: true }),
    )
      .then((result) => {
        if (result.error) throw result.error;
        if (isCurrent()) {
          setCountdowns((result.data ?? []) as CountdownRow[]);
          markSuccessful("countdowns");
        }
      })
      .catch((error) => {
        console.error("Idag: kunde inte hämta nedräkningar:", error);
        if (isCurrent()) {
          updateSourceError("countdowns", true);
        }
      });

    const familyTask = getFamilyMembersFromDatabase()
      .then((members) => {
        const events = createUpcomingFamilyEvents(members);
        if (isCurrent()) { markSuccessful("family"); setFamilyEvents(events); }
      })
      .catch((error) => {
        console.error("Idag: kunde inte hämta familjehändelser:", error);
        if (isCurrent()) {
          updateSourceError("family", true);
        }
      });

    const weatherTask = fetch(
      "/api/everyday-weather",
      forceRefresh ? { cache: "reload" } : undefined,
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Väder-API svarade ${response.status}.`);
        }
        const data = (await response.json()) as EverydayWeather;
        if (isCurrent()) { markSuccessful("weather"); setWeather(data); }
      })
      .catch((error) => {
        console.error("Idag: kunde inte hämta väder:", error);
        if (isCurrent()) {
          updateSourceError("weather", true);
        }
      });

    const electricityTask = fetch(
      "/api/electricity",
      forceRefresh ? { cache: "reload" } : undefined,
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Elpris-API svarade ${response.status}.`);
        }
        const data = (await response.json()) as ElectricityData;
        if (!Array.isArray(data.prices)) {
          throw new Error("Elpris-API returnerade ogiltiga priser.");
        }
        if (isCurrent()) { markSuccessful("electricity"); setElectricity(data); }
      })
      .catch((error) => {
        console.error("Idag: kunde inte hämta elpriser:", error);
        if (isCurrent()) {
          updateSourceError("electricity", true);
        }
      });

    // Laddningsindikatorn och uppdateringsknappen återställs
    // när samtliga källor har avslutats, precis som tidigare.
    return Promise.all([
      calendarTask,
      schoolCalendarTask,
      countdownTask,
      familyTask,
      weatherTask,
      electricityTask,
    ]).then(() => {
      if (isCurrent()) setIsLoading(false);
    });
  }, [markSuccessful, updateSourceError]);

  const loadData = useCallback(
    (showLoader = true, forceRefresh = false) => {
      if (showLoader) setIsLoading(true);
      return fetchData(forceRefresh);
    },
    [fetchData],
  );

  useEffect(() => {
    // Undvik onödiga API-anrop när PWA:n ligger i bakgrunden.
    // Hämta färska uppgifter när användaren återvänder efter 15 minuter.
    const refreshIntervalMs = 15 * 60 * 1000;
    const refreshIfStale = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      if (Date.now() - lastFetchAtRef.current < refreshIntervalMs) return;
      void loadData(false);
    };

    void fetchData();
    const refreshId = window.setInterval(refreshIfStale, 60 * 1000);
    document.addEventListener("visibilitychange", refreshIfStale);
    window.addEventListener("online", refreshIfStale);

    return () => {
      window.clearInterval(refreshId);
      document.removeEventListener("visibilitychange", refreshIfStale);
      window.removeEventListener("online", refreshIfStale);
      requestIdRef.current += 1;
    };
  }, [fetchData, loadData]);

  const nextFamilyEvent = useMemo(
    () =>
      familyEvents.find((event) => event.daysUntil >= 0) ?? null,
    [familyEvents]
  );

  const nextCountdown = countdowns.find(row => getDaysUntil(row.event_date) >= 0) ?? null;

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

  const openTab = (tab: string, child?: string, anchor?: string) => {
    window.dispatchEvent(new CustomEvent("family-dashboard:navigate", {
      detail: { tab, child, anchor },
    }));
  };

  const quickLinks = [
    { label: "Kalender", caption: "Öppna kalenderwidgeten", icon: CalendarDays, tab: "home", child: "home", anchor: "dashboard-google-calendar", tone: "bg-blue-500/15 text-blue-300" },
    { label: "Inköp", caption: "Handlingslistan", icon: ShoppingCart, tab: "home", child: "shopping", tone: "bg-emerald-500/15 text-emerald-300" },
    { label: "Familjen", caption: "Familjeöversikt", icon: Users, tab: "family", child: "Gemensam", tone: "bg-violet-500/15 text-violet-300" },
    { label: "Utforska", caption: "Rymden och jorden", icon: Compass, tab: "fun", child: "overview", tone: "bg-amber-500/15 text-amber-300" },
  ];

  return (
    <div className="min-w-0 space-y-5 rounded-[22px] bg-slate-900/45 p-2.5 text-slate-100 sm:rounded-[28px] sm:p-5 lg:p-7">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">FAMILJENS ÖVERSIKT</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:mt-2 sm:text-4xl">
            {now ? getGreeting(now.getHours()) : "Välkommen hem"} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-sm leading-snug text-slate-300 sm:mt-2">{assistantLead?.message ?? "Här är dagens viktigaste händelser."}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-400 sm:mt-3 sm:gap-4">
            <span className="flex items-center gap-1.5 capitalize"><CalendarDays size={15}/>{now ? now.toLocaleDateString("sv-SE", {weekday:"long",day:"numeric",month:"long"}) : "Laddar datum…"}</span>
            <span className="flex items-center gap-1.5"><Clock3 size={15}/>{now ? now.toLocaleTimeString("sv-SE", {hour:"2-digit",minute:"2-digit"}) : "--:--"}</span>
          </div>
        </div>
        <button type="button" onClick={() => void loadData(true, true)} disabled={isLoading}
          className="inline-flex min-h-11 w-fit items-center gap-2 self-end touch-manipulation rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm sm:self-auto font-semibold text-slate-200 shadow-sm transition hover:bg-slate-800 disabled:opacity-50">
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""}/> Uppdatera
        </button>
      </header>

      {hasPartialError && <div role="status" className="flex gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200"><TriangleAlert size={18} className="shrink-0"/>Vissa uppgifter kunde inte hämtas: {Object.entries({calendar: "Google Kalender", school: "Skolkalender", countdowns: "Nedräkningar", family: "Familjehändelser", weather: "Väder", electricity: "Elpris"}).filter(([key]) => sourceErrors[key as DataSource]).map(([, label]) => label).join(", ")}. Tidigare hämtade uppgifter behålls där de finns, men kan vara inaktuella.</div>}

      <section aria-label="Väderöversikt" className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#132a48] via-[#183a60] to-[#0c1a30] border border-sky-400/20 p-3.5 text-white shadow-[0_16px_40px_-22px_rgba(33,104,166,.65)] sm:p-7">
        {/* Göteborgs illustrerade skyline – enbart dekor, utan externa anrop. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[url('/images/goteborg-skyline.png')] bg-cover bg-center opacity-60" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07182e]/95 via-[#0b2440]/80 to-[#0b2039]/65" />
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-slate-950/30 blur-2xl"/>
        <div className="relative flex flex-col justify-between gap-3 sm:gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
            <div className="text-5xl drop-shadow-sm sm:text-7xl" aria-hidden="true">{weather ? getCompactWeatherSymbol(weather.weatherCode) : "🌤️"}</div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white/80"><MapPin size={15}/>{weather?.location ?? "Vädret just nu"}</p>
              <div className="mt-1 flex items-end gap-3"><span className="text-5xl font-extrabold tracking-tighter sm:text-7xl">{weather ? `${Math.round(weather.temperature)}°` : "--°"}</span><span className="mb-1 min-w-0 text-xs font-semibold leading-snug text-white/90 sm:mb-2 sm:text-sm">{weather?.description ?? (sourceErrors.weather ? "Vädret är tillfälligt otillgängligt" : "Hämtar väder…")}</span></div>
              <p className="mt-1 text-xs text-white/85 sm:mt-2 sm:text-sm">{weather ? `Högst ${Math.round(weather.temperatureMax)}° · Lägst ${Math.round(weather.temperatureMin)}°` : (sourceErrors.weather ? "Försök uppdatera igen" : "Aktuell prognos laddas")}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 lg:min-w-[290px]">
            <div className="rounded-2xl bg-slate-950/35 border border-white/10 p-2 text-center backdrop-blur-sm sm:p-3"><Droplets size={18} className="mx-auto mb-1 sm:mb-2"/><p className="text-lg font-bold">{weather ? `${Math.round(weather.precipitationProbability)}%` : "–"}</p><p className="text-xs text-white/75">Regnrisk</p></div>
            <div className="rounded-2xl bg-slate-950/35 border border-white/10 p-2 text-center backdrop-blur-sm sm:p-3"><Wind size={18} className="mx-auto mb-1 sm:mb-2"/><p className="text-lg font-bold">{weather ? Math.round(weather.windSpeed) : "–"}</p><p className="text-xs text-white/75">Vind m/s</p></div>
            <div className="rounded-2xl bg-slate-950/35 border border-white/10 p-2 text-center backdrop-blur-sm sm:p-3"><Sun size={18} className="mx-auto mb-1 sm:mb-2"/><p className="text-lg font-bold">{weather ? Math.round(weather.uvIndex) : "–"}</p><p className="text-xs text-white/75">UV-index</p></div>
          </div>
        </div>
        {sourceErrors.weather && <p role="status" className="relative mt-3 rounded-xl border border-amber-300/30 bg-amber-500/15 p-3 text-xs text-amber-100">{hasPreviousData.weather ? "Vädret kunde inte uppdateras. Senast hämtad prognos visas och kan vara inaktuell." : "Vädret kunde inte hämtas. Försök uppdatera igen."}</p>}
        {weather?.hourlyForecast && weather.hourlyForecast.length > 0 && <div className="relative mt-3 border-t border-white/25 pt-3 sm:mt-6 sm:pt-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white/80"><span>Kommande 24 timmar</span><span>Svep åt sidan för fler timmar →</span></div>
          <div className="relative z-20 flex snap-x gap-2 overflow-x-auto overscroll-x-contain pb-2 touch-pan-x [scrollbar-width:thin]">
            {weather.hourlyForecast.slice(0, 24).map(hour => <div key={hour.time} className="min-w-[65px] shrink-0 snap-start rounded-xl bg-slate-950/30 px-2 py-2 text-center">
              <p className="text-[11px] text-white/80">{new Date(hour.time).toLocaleTimeString("sv-SE", {hour:"2-digit",minute:"2-digit",timeZone:STOCKHOLM_TIME_ZONE})}</p>
              <p className="my-1 text-xl" aria-hidden="true">{getCompactWeatherSymbol(hour.weatherCode)}</p>
              <p className="text-sm font-bold">{Math.round(hour.temperature)}°</p>
              {hour.precipitationProbability > 0 && <p className="mt-1 text-[10px] text-white/80">{Math.round(hour.precipitationProbability)}%</p>}
            </div>)}
          </div>
        </div>}
        <button type="button" aria-label="Öppna väderfliken" onClick={() => openTab("weather")} className="absolute inset-0 z-10 cursor-pointer touch-manipulation rounded-[26px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sky-300" />
      </section>

      <section aria-label="Snabbgenvägar">
        <h2 className="mb-3 text-lg font-extrabold text-white">Genvägar</h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          {quickLinks.map(link => <button key={link.label} type="button" onClick={() => openTab(link.tab, link.child, "anchor" in link ? link.anchor : undefined)}
            className="group flex min-h-14 min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 p-2.5 text-left touch-manipulation shadow-sm transition-colors hover:bg-slate-800/90 active:bg-slate-700/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 sm:gap-3 sm:p-4 sm:transition-transform sm:hover:-translate-y-0.5 sm:hover:shadow-lg sm:hover:shadow-black/20">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${link.tone}`}><link.icon size={21}/></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-100">{link.label}</span><span className="hidden text-xs leading-snug text-slate-400 sm:block">{link.caption}</span></span>
            <ArrowUpRight size={15} className="hidden shrink-0 text-slate-400 transition group-hover:text-sky-300 sm:block"/>
          </button>)}
        </div>
      </section>

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-5">
        <section id="hem-kalender" className="relative min-w-0 rounded-[24px] border border-white/10 bg-slate-900/80 p-3.5 shadow-sm xl:col-span-3 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-2 sm:mb-5"><div className="min-w-0 flex items-center gap-2"><span className="rounded-xl bg-blue-500/15 p-2 text-blue-300"><CalendarCheck2 size={20}/></span><h2 className="text-base font-extrabold leading-tight text-white sm:text-lg">Kalender & dagens plan</h2></div><span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">Idag</span></div>
          {sourceErrors.calendar && <div role="status" className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">{hasPreviousData.calendar ? "Kalendern kunde inte uppdateras. Visar senast hämtade uppgifter, som kan vara inaktuella." : "Google Kalender kunde inte hämtas just nu. Försök uppdatera igen."}</div>}
          {(!sourceErrors.calendar || hasPreviousData.calendar) && (calendarHeroEvents.length ? <div className="space-y-3">{calendarHeroEvents.map(event => <article key={event.id} className="rounded-2xl border border-white/10 bg-slate-800/65 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-white">{event.title}</p><p className="mt-1 text-sm text-slate-400">{event.startTime ? `${formatCalendarDate(event.startTime)} · ${getEventTime(event)}` : getEventTime(event)}</p></div>{activeCalendarEvents.some(active => active.id === event.id) && <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300">Pågår</span>}</div>
          </article>)}</div> : <div className="rounded-2xl bg-slate-800/65 p-5 text-sm text-[#8292a3]">Inga kommande kalenderhändelser just nu.</div>)}
          {(todaysSchoolTransfers.dropoffs.length > 0 || todaysSchoolTransfers.pickups.length > 0) && <div className="mt-4 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-200"><p className="font-bold">Förskola idag{sourceErrors.school ? " · Senast hämtat" : ""}</p>{todaysSchoolTransfers.dropoffs.map(t=><p key={t.id}>Lämning: {t.person} · {t.time}</p>)}{todaysSchoolTransfers.pickups.map(t=><p key={t.id}>Hämtning: {t.person} · {t.time}</p>)}</div>}

          <button type="button" aria-label="Öppna kalenderwidgeten" onClick={() => openTab("home", "home", "dashboard-google-calendar")} className="absolute inset-0 z-10 cursor-pointer touch-manipulation rounded-[24px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sky-300" />
        </section>
        <section className="relative min-w-0 rounded-[24px] border border-white/10 bg-slate-900/80 p-3.5 shadow-sm xl:col-span-2 sm:p-6">
          <div className="mb-3 flex items-center gap-2 sm:mb-5"><span className="rounded-xl bg-amber-500/15 p-2 text-amber-300"><Zap size={20}/></span><h2 className="text-lg font-extrabold text-white">Elpris just nu</h2></div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#93a3b2]">Aktuellt pris</p><p className="mt-2 text-4xl font-extrabold tracking-tight text-white">{electricity?.currentPrice ? formatPrice(electricity.currentPrice.SEK_per_kWh) : "–"}<span className="ml-2 text-sm font-semibold text-slate-400">kr/kWh</span></p>
          <p className="mt-3 text-sm text-slate-400">{sourceErrors.electricity ? (hasPreviousData.electricity ? "Elpriset kunde inte uppdateras. Senast hämtade priser visas och kan vara inaktuella." : "Elpriset kunde inte hämtas just nu. Försök uppdatera igen.") : electricityAdvice.description}</p>
          <button type="button" aria-label="Öppna elpriswidgeten under Hemmet – Ekonomi" onClick={() => openTab("home", "shopping")} className="absolute inset-0 z-10 cursor-pointer touch-manipulation rounded-[24px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sky-300" />
        </section>
      </div>

      <section className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <article className="relative rounded-[24px] border border-white/10 bg-slate-900/80 p-3.5 shadow-sm sm:p-6"><div className="mb-3 flex items-center gap-2 sm:mb-4"><span className="rounded-xl bg-violet-500/15 p-2 text-violet-300"><Gift size={20}/></span><h2 className="font-extrabold text-white">Nästa familjehändelse</h2></div><p className="text-lg font-bold text-white">{nextFamilyEvent?.title ?? "Ingen kommande händelse"}</p><p className="mt-1 text-sm text-slate-400">{sourceErrors.family ? (hasPreviousData.family ? "Senast hämtad information – kan vara inaktuell" : "Familjehändelser kunde inte hämtas") : nextFamilyEvent ? getDaysLabel(nextFamilyEvent.daysUntil) : "Här visas kommande familjehändelser"}</p><button type="button" aria-label="Öppna Familjen – Gemensam" onClick={() => openTab("family", "Gemensam")} className="absolute inset-0 z-10 cursor-pointer touch-manipulation rounded-[24px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sky-300" /></article>
        <article className="relative rounded-[24px] border border-white/10 bg-slate-900/80 p-3.5 shadow-sm sm:p-6"><div className="mb-3 flex items-center gap-2 sm:mb-4"><span className="rounded-xl bg-cyan-500/15 p-2 text-cyan-300"><Hourglass size={20}/></span><h2 className="font-extrabold text-white">Nästa nedräkning</h2></div><p className="text-lg font-bold text-white">{nextCountdown?.title ?? "Ingen aktiv nedräkning"}</p><p className="mt-1 text-sm text-slate-400">{sourceErrors.countdowns ? (hasPreviousData.countdowns ? "Senast hämtad information – kan vara inaktuell" : "Nedräkningar kunde inte hämtas") : nextCountdown ? getDaysLabel(getDaysUntil(nextCountdown.event_date)) : "Här visas nästa nedräkning"}</p><button type="button" aria-label="Öppna nedräkningar under Hemmet" onClick={() => openTab("home", "home")} className="absolute inset-0 z-10 cursor-pointer touch-manipulation rounded-[24px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sky-300" /></article>
      </section>

    </div>
  );
}
