import * as cheerio from "cheerio";

import type {
  BathingData,
  BathingPlace,
} from "@/lib/bathing";

const SOURCE_URL =
  "https://www.havochvatten.se/badplatser-och-badvatten/kommuner/badplatser-i-goteborgs-stad.html";

function parseTemperature(text: string): number | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*°C/i);

  if (!match) {
    return null;
  }

  return Number(match[1].replace(",", "."));
}

function parseBathingPlaces(html: string): BathingPlace[] {
  const $ = cheerio.load(html);
  const places: BathingPlace[] = [];

  $("a").each((_, element) => {
    const link = $(element);
    const text = link.text().replace(/\s+/g, " ").trim();

    if (!text.includes("Göteborg")) {
      return;
    }

    const temperature = parseTemperature(text);

    const containsWarning =
      text.toLowerCase().includes("avråder från bad") ||
      text.toLowerCase().includes("avrådan från bad");

    const nameMatch = text.match(
      /^(.*?)\s+Göteborg(?:\s+Kommunen avråder från bad)?(?:\s+\d+(?:[.,]\d+)?°C)?$/i
    );

    if (!nameMatch) {
      return;
    }

    const name = nameMatch[1].trim();

    if (!name || name === "Göteborg") {
      return;
    }

    const href = link.attr("href");

    const absoluteUrl = href
      ? new URL(href, SOURCE_URL).toString()
      : null;

    places.push({
      name,
      municipality: "Göteborg",
      temperature,
      warning: containsWarning
        ? "Kommunen avråder från bad"
        : null,
      url: absoluteUrl,
    });
  });

  const uniquePlaces = Array.from(
    new Map(
      places.map((place) => [place.name, place])
    ).values()
  );

  return uniquePlaces.sort((a, b) => {
    if (
      a.temperature === null &&
      b.temperature === null
    ) {
      return a.name.localeCompare(b.name, "sv-SE");
    }

    if (a.temperature === null) {
      return 1;
    }

    if (b.temperature === null) {
      return -1;
    }

    if (b.temperature !== a.temperature) {
      return b.temperature - a.temperature;
    }

    return a.name.localeCompare(b.name, "sv-SE");
  });
}

export async function GET() {
  try {
    const response = await fetch(SOURCE_URL, {
      next: {
        revalidate: 1800,
      },
      headers: {
        "User-Agent":
          "FamilyDashboard/1.0 bathing-temperature-widget",
      },
    });

    if (!response.ok) {
      return Response.json(
        {
          error: "Kunde inte hämta badtemperaturer",
          status: response.status,
        },
        {
          status: 502,
        }
      );
    }

    const html = await response.text();
    const places = parseBathingPlaces(html);

    if (places.length === 0) {
      return Response.json(
        {
          error:
            "Inga badplatser kunde läsas från källan",
        },
        {
          status: 502,
        }
      );
    }

    const data: BathingData = {
      municipality: "Göteborg",
      updatedAt: new Date().toISOString(),
      places,
    };

    return Response.json(data);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ett okänt fel uppstod",
      },
      {
        status: 500,
      }
    );
  }
}