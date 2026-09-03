import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

const SOURCE_URL = "https://www.goteborg.com/evenemang";
const SOURCE_NAME = "goteborg.com";

type EventItem = {
  id: string;
  title: string;
  subtitle: string | null;
  place: string | null;
  dateText: string | null;
  url: string;
  imageUrl: string | null;
  isFree: boolean;
  isFamily: boolean;
  dates: string[];
};

type DayGroup = {
  date: string;
  events: EventItem[];
};

const SWEDISH_MONTHS: Record<string, number> = {
  jan: 0,
  januari: 0,
  feb: 1,
  februari: 1,
  mar: 2,
  mars: 2,
  apr: 3,
  april: 3,
  maj: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  aug: 7,
  augusti: 7,
  sep: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeSpace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function absoluteUrl(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, "https://www.goteborg.com").toString();
  } catch {
    return null;
  }
}

function parseSingleDate(
  day: number,
  monthName: string,
  year: number
) {
  const month =
    SWEDISH_MONTHS[monthName.toLocaleLowerCase("sv-SE")];

  if (month === undefined) {
    return null;
  }

  const date = new Date(year, month, day);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseEventRange(
  value: string | null,
  fallbackYear: number
): { start: Date; end: Date } | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeSpace(
    value
      .toLocaleLowerCase("sv-SE")
      .replace(/[–—]/g, "-")
  );

  if (normalized === "idag") {
    const today = startOfLocalDay(new Date());
    return { start: today, end: today };
  }

  const fullRange = normalized.match(
    /(\d{1,2})\s+([a-zåäö]+)(?:\s+(\d{4}))?\s*-\s*(\d{1,2})\s+([a-zåäö]+)(?:\s+(\d{4}))?/
  );

  if (fullRange) {
    const startDay = Number(fullRange[1]);
    const startMonth = fullRange[2];
    const startYear = Number(fullRange[3] ?? fallbackYear);
    const endDay = Number(fullRange[4]);
    const endMonth = fullRange[5];
    let endYear = Number(fullRange[6] ?? startYear);

    const start = parseSingleDate(
      startDay,
      startMonth,
      startYear
    );

    if (!start) {
      return null;
    }

    const startMonthIndex =
      SWEDISH_MONTHS[startMonth] ?? start.getMonth();
    const endMonthIndex =
      SWEDISH_MONTHS[endMonth] ?? startMonthIndex;

    if (
      !fullRange[6] &&
      endMonthIndex < startMonthIndex
    ) {
      endYear += 1;
    }

    const end = parseSingleDate(
      endDay,
      endMonth,
      endYear
    );

    if (!end) {
      return null;
    }

    return { start, end };
  }

  const compactRange = normalized.match(
    /(\d{1,2})\s*-\s*(\d{1,2})\s+([a-zåäö]+)(?:\s+(\d{4}))?/
  );

  if (compactRange) {
    const year = Number(
      compactRange[4] ?? fallbackYear
    );

    const start = parseSingleDate(
      Number(compactRange[1]),
      compactRange[3],
      year
    );

    const end = parseSingleDate(
      Number(compactRange[2]),
      compactRange[3],
      year
    );

    if (!start || !end) {
      return null;
    }

    return { start, end };
  }

  const singleDate = normalized.match(
    /(\d{1,2})\s+([a-zåäö]+)(?:\s+(\d{4}))?/
  );

  if (singleDate) {
    const date = parseSingleDate(
      Number(singleDate[1]),
      singleDate[2],
      Number(singleDate[3] ?? fallbackYear)
    );

    if (!date) {
      return null;
    }

    return { start: date, end: date };
  }

  return null;
}

function datesInsideRange(
  eventRange: { start: Date; end: Date } | null,
  requestedStart: Date,
  requestedEnd: Date
) {
  if (!eventRange) {
    return [];
  }

  const start =
    eventRange.start > requestedStart
      ? eventRange.start
      : requestedStart;

  const end =
    eventRange.end < requestedEnd
      ? eventRange.end
      : requestedEnd;

  if (start > end) {
    return [];
  }

  const dates: string[] = [];

  for (
    let cursor = startOfLocalDay(start);
    cursor <= end;
    cursor = addDays(cursor, 1)
  ) {
    dates.push(toIsoDate(cursor));
  }

  return dates;
}

function extractDateText(text: string) {
  const patterns = [
    /\bIdag\b/i,
    /\b\d{1,2}\s+[a-zåäö]+(?:\s+\d{4})?\s*[–—-]\s*\d{1,2}\s+[a-zåäö]+(?:\s+\d{4})?\b/i,
    /\b\d{1,2}\s*[–—-]\s*\d{1,2}\s+[a-zåäö]+(?:\s+\d{4})?\b/i,
    /\b\d{1,2}\s+[a-zåäö]+(?:\s+\d{4})?\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return normalizeSpace(match[0]);
    }
  }

  return null;
}

function extractPlace(text: string) {
  const explicit = text.match(
    /Plats:\s*([^|]+?)(?=(?:\d{1,2}\s+[a-zåäö]+|Idag|$))/i
  );

  if (explicit?.[1]) {
    return normalizeSpace(explicit[1]);
  }

  return null;
}

function eventIdFromUrl(url: string) {
  const match = url.match(
    /\/evenemang\/([^/?#]+)/
  );

  return match?.[1] ?? url;
}

function collectJsonLdEvents(
  $: cheerio.CheerioAPI,
  requestedStart: Date,
  requestedEnd: Date
) {
  const events: EventItem[] = [];

  function walk(value: unknown) {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const item = value as Record<string, unknown>;

    if (
      item["@type"] === "Event" &&
      typeof item.name === "string"
    ) {
      const url =
        absoluteUrl(
          typeof item.url === "string"
            ? item.url
            : null
        ) ?? SOURCE_URL;

      const location =
        item.location &&
        typeof item.location === "object"
          ? (item.location as Record<string, unknown>)
          : null;

      const place =
        location &&
        typeof location.name === "string"
          ? normalizeSpace(location.name)
          : null;

      const startValue =
        typeof item.startDate === "string"
          ? new Date(item.startDate)
          : null;

      const endValue =
        typeof item.endDate === "string"
          ? new Date(item.endDate)
          : startValue;

      const range =
        startValue &&
        !Number.isNaN(startValue.getTime())
          ? {
              start: startOfLocalDay(startValue),
              end:
                endValue &&
                !Number.isNaN(endValue.getTime())
                  ? startOfLocalDay(endValue)
                  : startOfLocalDay(startValue),
            }
          : null;

      const dates = datesInsideRange(
        range,
        requestedStart,
        requestedEnd
      );

      if (dates.length > 0) {
        const image =
          typeof item.image === "string"
            ? item.image
            : Array.isArray(item.image) &&
              typeof item.image[0] === "string"
            ? item.image[0]
            : null;

        const description =
          typeof item.description === "string"
            ? normalizeSpace(item.description)
            : null;

        events.push({
          id: eventIdFromUrl(url),
          title: normalizeSpace(item.name),
          subtitle: description,
          place,
          dateText: null,
          url,
          imageUrl: absoluteUrl(image),
          isFree:
            description
              ?.toLocaleLowerCase("sv-SE")
              .includes("gratis") ?? false,
          isFamily:
            description
              ?.toLocaleLowerCase("sv-SE")
              .match(/barn|familj/) !== null,
          dates,
        });
      }
    }

    Object.values(item).forEach(walk);
  }

  $('script[type="application/ld+json"]').each(
    (_, element) => {
      try {
        walk(JSON.parse($(element).html() ?? ""));
      } catch {
        // Ignorera trasig JSON-LD och fortsätt till DOM-fallback.
      }
    }
  );

  return events;
}

function collectDomEvents(
  $: cheerio.CheerioAPI,
  requestedStart: Date,
  requestedEnd: Date
) {
  const events = new Map<string, EventItem>();

  $('a[href*="/evenemang/"]').each(
    (_, anchor) => {
      const link = $(anchor);
      const href = link.attr("href");
      const url = absoluteUrl(href);

      if (
        !url ||
        url === `${SOURCE_URL}/` ||
        url === SOURCE_URL
      ) {
        return;
      }

      const title = normalizeSpace(link.text());

      if (
        !title ||
        title.length < 3 ||
        /visa mer|evenemangskalender/i.test(title)
      ) {
        return;
      }

      let container = link.closest(
        "article, li, [class*='card'], [class*='Card']"
      );

      if (!container.length) {
        container = link.parent().parent();
      }

      const text = normalizeSpace(container.text());
      const dateText = extractDateText(text);

      if (!dateText) {
        return;
      }

      const range = parseEventRange(
        dateText,
        requestedStart.getFullYear()
      );

      const dates = datesInsideRange(
        range,
        requestedStart,
        requestedEnd
      );

      if (dates.length === 0) {
        return;
      }

      const image = container.find("img").first();
      const imageUrl =
        absoluteUrl(
          image.attr("src") ??
            image.attr("data-src") ??
            image.attr("srcset")?.split(" ")[0]
        );

      const lower = text.toLocaleLowerCase("sv-SE");
      const place = extractPlace(text);

      const textWithoutTitle = normalizeSpace(
        text.replace(title, "")
      );

      const subtitleCandidate = textWithoutTitle
        .replace(dateText, "")
        .replace(place ? `Plats:${place}` : "", "")
        .trim();

      events.set(eventIdFromUrl(url), {
        id: eventIdFromUrl(url),
        title,
        subtitle:
          subtitleCandidate &&
          subtitleCandidate.length <= 180
            ? subtitleCandidate
            : null,
        place,
        dateText,
        url,
        imageUrl,
        isFree: lower.includes("gratis"),
        isFamily:
          lower.includes("barn") ||
          lower.includes("familj"),
        dates,
      });
    }
  );

  return [...events.values()];
}

function mergeEvents(
  first: EventItem[],
  second: EventItem[]
) {
  const merged = new Map<string, EventItem>();

  for (const event of [...first, ...second]) {
    const existing = merged.get(event.id);

    if (!existing) {
      merged.set(event.id, event);
      continue;
    }

    merged.set(event.id, {
      ...existing,
      ...event,
      subtitle: event.subtitle ?? existing.subtitle,
      place: event.place ?? existing.place,
      dateText: event.dateText ?? existing.dateText,
      imageUrl: event.imageUrl ?? existing.imageUrl,
      isFree: existing.isFree || event.isFree,
      isFamily: existing.isFamily || event.isFamily,
      dates: Array.from(
        new Set([...existing.dates, ...event.dates])
      ).sort(),
    });
  }

  return [...merged.values()];
}

export async function GET() {
  const today = startOfLocalDay(new Date());

  // Vi hämtar totalt 8 dagar:
  // - idag används av "Göteborg idag"
  // - imorgon + 6 dagar används av "Evenemang · 7 dagar"
  const requestedStart = today;
  const requestedEnd = addDays(today, 7);

  const url = new URL(SOURCE_URL);
  url.searchParams.set("start", toIsoDate(requestedStart));
  url.searchParams.set("end", toIsoDate(requestedEnd));

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "FamilyDashboard/1.0 (+personal dashboard)",
      },
      next: {
        revalidate: 15 * 60,
      },
    });

    if (!response.ok) {
      throw new Error(
        `goteborg.com svarade med HTTP ${response.status}`
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const jsonLdEvents = collectJsonLdEvents(
      $,
      requestedStart,
      requestedEnd
    );

    const domEvents = collectDomEvents(
      $,
      requestedStart,
      requestedEnd
    );

    const events = mergeEvents(
      jsonLdEvents,
      domEvents
    ).sort((a, b) => {
      const firstDate = a.dates[0] ?? "";
      const secondDate = b.dates[0] ?? "";

      return (
        firstDate.localeCompare(secondDate) ||
        a.title.localeCompare(b.title, "sv-SE")
      );
    });

    const todayIso = toIsoDate(today);

    const todayEvents = events.filter((event) =>
      event.dates.includes(todayIso)
    );

    const upcomingDays: DayGroup[] = Array.from(
      { length: 7 },
      (_, index) => {
        const date = toIsoDate(
          addDays(today, index + 1)
        );

        return {
          date,
          events: events.filter((event) =>
            event.dates.includes(date)
          ),
        };
      }
    );

    return NextResponse.json({
      source: SOURCE_NAME,
      sourceUrl: url.toString(),
      today: {
        date: todayIso,
        events: todayEvents,
      },
      todayCount: todayEvents.length,
      upcomingStartDate:
        upcomingDays[0]?.date ?? null,
      upcomingEndDate:
        upcomingDays[6]?.date ?? null,
      upcomingDays,
      total: events.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Kunde inte hämta Göteborgsevenemang:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Evenemangen kunde inte hämtas.",
      },
      { status: 502 }
    );
  }
}
