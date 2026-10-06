import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type LunchDay = {
  date: string | null;
  day: string;
  meals: string[];
};

const SWEDISH_DAYS = [
  "måndag",
  "tisdag",
  "onsdag",
  "torsdag",
  "fredag",
  "lördag",
  "söndag",
];

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value: string) {
  return decodeXml(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readTag(xml: string, tag: string) {
  const match = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i")
  );
  return match ? stripHtml(match[1]) : "";
}

function normalizeDayName(value: string) {
  const lower = value.toLocaleLowerCase("sv-SE");
  const day = SWEDISH_DAYS.find((candidate) => lower.includes(candidate));
  return day ? day.charAt(0).toLocaleUpperCase("sv-SE") + day.slice(1) : null;
}

function parseIsoDate(value: string) {
  const match = value.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function parseSwedishDate(value: string) {
  const match = value.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](20\d{2}))?\b/);
  if (!match) return null;

  const year = match[3] ?? String(new Date().getFullYear());
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function extractDate(...values: string[]) {
  const joined = values.join(" ");
  return parseIsoDate(joined) ?? parseSwedishDate(joined);
}

const GLOBAL_LUNCH_INFO_PATTERNS = [
  /i\s*måltiden\s*ingår\s*salladsbuffé\s*,?\s*knäckebröd\s*,?\s*mjölk\s*eller\s*vatten\.?/gi,
  /vi\s*reserverar\s*oss\s*för\s*eventuella\s*ändringar\.?/gi,
];

function removeGlobalLunchInfo(value: string) {
  return GLOBAL_LUNCH_INFO_PATTERNS.reduce(
    (result, pattern) => result.replace(pattern, ""),
    value
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanMealLine(value: string) {
  return removeGlobalLunchInfo(value)
    .replace(/^(mat|lunch|dagens|meny|vegetarisk|vegetariskt)\s*[:\-–]\s*/i, "")
    .replace(/^[•·*\-–]\s*/, "")
    .trim();
}

function extractMeals(title: string, description: string, content: string) {
  const raw = [description, content]
    .filter(Boolean)
    .map((value) => removeGlobalLunchInfo(value))
    .join("\n")
    .split(/\n|<br\s*\/?>/i)
    .map((line) => cleanMealLine(stripHtml(line)))
    .filter(Boolean);

  const titleWithoutDayAndDate = title
    .replace(
      new RegExp(`\\b(${SWEDISH_DAYS.join("|")})\\b`, "i"),
      ""
    )
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, "")
    .replace(/\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]20\d{2})?\b/g, "")
    .replace(/^[\s:,\-–]+|[\s:,\-–]+$/g, "")
    .trim();

  if (raw.length === 0 && titleWithoutDayAndDate) {
    raw.push(cleanMealLine(titleWithoutDayAndDate));
  }

  const ignored = [
    /^vecka\s+\d+/i,
    /^matsedel/i,
    /^skolmaten/i,
    /^bjurslättsskolan$/i,
    /^i måltiden ingår salladsbuffé,?\s*knäckebröd,?\s*mjölk eller vatten\.?$/i,
    /^vi reserverar oss för eventuella ändringar\.?$/i,
  ];

  return [...new Set(raw)]
    .filter((line) => line.length > 1)
    .filter((line) => !ignored.some((pattern) => pattern.test(line)));
}

function parseRss(xml: string): LunchDay[] {
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];

  const parsed = items
    .map((item): LunchDay | null => {
      const title = readTag(item, "title");
      const description = readTag(item, "description");
      const content =
        readTag(item, "content:encoded") ||
        readTag(item, "content") ||
        readTag(item, "summary");

      const combined = `${title}\n${description}\n${content}`;
      const day = normalizeDayName(combined);
      if (!day) return null;

      return {
        date: extractDate(title, description, content),
        day,
        meals: extractMeals(title, description, content),
      };
    })
    .filter((item): item is LunchDay => item !== null);

  const merged = new Map<string, LunchDay>();

  for (const item of parsed) {
    const key = item.date ?? item.day;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, item);
      continue;
    }

    merged.set(key, {
      ...existing,
      date: existing.date ?? item.date,
      meals: [...new Set([...existing.meals, ...item.meals])],
    });
  }

  return [...merged.values()].sort((a, b) => {
    const ai = SWEDISH_DAYS.indexOf(a.day.toLocaleLowerCase("sv-SE"));
    const bi = SWEDISH_DAYS.indexOf(b.day.toLocaleLowerCase("sv-SE"));
    return ai - bi;
  });
}

function getSchoolSlug(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  } catch {
    return "";
  }
}

function getSchoolName(xml: string, slug: string) {
  const channelBeforeItems = xml.split(/<item(?:\s[^>]*)?>/i)[0] ?? xml;
  const channelTitle = readTag(channelBeforeItems, "title")
    .replace(/\s*[|–-]\s*Skolmaten.*$/i, "")
    .replace(/^Skolmaten\s*[|–-]\s*/i, "")
    .trim();

  if (channelTitle && channelTitle.toLocaleLowerCase("sv-SE") !== "skolmaten") {
    return channelTitle;
  }

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("sv-SE") + part.slice(1))
    .join(" ");
}

async function getSchoolLunchUrl() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", "school_lunch_url")
    .maybeSingle();

  if (error) {
    throw new Error(`Kunde inte läsa skolinställningen: ${error.message}`);
  }

  const url = data?.setting_value?.trim() ?? "";

  if (!url) {
    throw new Error("Ingen länk till skolmatsedel är konfigurerad i Admin.");
  }

  const parsed = new URL(url);

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "skolmaten.se" ||
    !parsed.pathname.startsWith("/api/4/rss/week/")
  ) {
    throw new Error("Den sparade matsedelslänken är inte en giltig Skolmaten RSS-länk.");
  }

  return url;
}

export async function GET() {
  let schoolSlug = "";
  let schoolName = "Skola";

  try {
    const rssUrl = await getSchoolLunchUrl();
    schoolSlug = getSchoolSlug(rssUrl);

    const response = await fetch(rssUrl, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent": "family-dashboard/1.0",
      },
      next: { revalidate: 60 * 60 },
    });

    if (!response.ok) {
      throw new Error(`Skolmaten RSS svarade med HTTP ${response.status}.`);
    }

    const xml = await response.text();
    schoolName = getSchoolName(xml, schoolSlug);
    const days = parseRss(xml);

    if (days.length === 0) {
      throw new Error("RSS-flödet innehöll inga dagar som kunde tolkas.");
    }

    return Response.json({
      connected: true,
      school: {
        name: schoolName,
        slug: schoolSlug,
      },
      source: "Skolmaten RSS",
      days,
    });
  } catch (error) {
    console.error("School lunch fetch failed:", error);

    return Response.json(
      {
        connected: false,
        school: {
          name: schoolName,
          slug: schoolSlug,
        },
        source: "Skolmaten RSS",
        days: [],
        error:
          error instanceof Error
            ? error.message
            : "Kunde inte hämta skolmatsedeln.",
      },
      { status: 502 }
    );
  }
}
