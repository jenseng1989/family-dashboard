import {
  Body,
  Equator,
  Horizon,
  Illumination,
  MoonPhase,
  Observer,
  SearchMoonPhase,
} from "astronomy-engine";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOTHENBURG = {
  latitude: 57.7089,
  longitude: 11.9746,
  elevationMeters: 10,
};

const ANIMALS = [
  {
    name: "Havsutter",
    emoji: "🦦",
    habitat: "Nordamerikas och Asiens kuster",
    fact: "Havsuttrar håller ibland varandra i tassarna när de sover så att de inte driver isär.",
    category: "Havsdjur",
    rarity: "Ovanlig",
  },
  {
    name: "Axolotl",
    emoji: "🦎",
    habitat: "Sötvatten nära Mexico City",
    fact: "Axolotlen kan återbilda delar av hjärta, ryggmärg och lemmar.",
    category: "Groddjur",
    rarity: "Sällsynt",
  },
  {
    name: "Pilgrimsfalk",
    emoji: "🦅",
    habitat: "Nästan hela världen",
    fact: "I en jaktstöt kan pilgrimsfalken nå hastigheter över 300 km/h.",
    category: "Fågel",
    rarity: "Ovanlig",
  },
  {
    name: "Bläckfisk",
    emoji: "🐙",
    habitat: "Hav över hela världen",
    fact: "Bläckfiskar har tre hjärtan och blått blod.",
    category: "Havsdjur",
    rarity: "Vanlig",
  },
  {
    name: "Vombat",
    emoji: "🐾",
    habitat: "Australien",
    fact: "Vombatens spillning är kubformad, vilket hindrar den från att rulla iväg.",
    category: "Däggdjur",
    rarity: "Ovanlig",
  },
  {
    name: "Rödräv",
    emoji: "🦊",
    habitat: "Europa, Asien och Nordamerika",
    fact: "Rävar kan höra små gnagare röra sig under ett lager av snö.",
    category: "Däggdjur",
    rarity: "Vanlig",
  },
  {
    name: "Kapybara",
    emoji: "🐹",
    habitat: "Sydamerika",
    fact: "Kapybaran är världens största gnagare och är en mycket skicklig simmare.",
    category: "Däggdjur",
    rarity: "Ovanlig",
  },
  {
    name: "Pangolin",
    emoji: "🦔",
    habitat: "Afrika och Asien",
    fact: "Pangolinen är det enda däggdjuret som är täckt av stora keratinfjäll.",
    category: "Däggdjur",
    rarity: "Sällsynt",
  },
  {
    name: "Kolibri",
    emoji: "🐦",
    habitat: "Nord- och Sydamerika",
    fact: "Kolibrier är de enda fåglar som kan flyga baklänges.",
    category: "Fågel",
    rarity: "Ovanlig",
  },
  {
    name: "Näckdjur",
    emoji: "🦆",
    habitat: "Östra Australien och Tasmanien",
    fact: "Näckdjuret är ett däggdjur som lägger ägg och kan känna elektriska signaler från bytesdjur.",
    category: "Däggdjur",
    rarity: "Sällsynt",
  },
  {
    name: "Mantisräka",
    emoji: "🦐",
    habitat: "Varma kustvatten",
    fact: "Mantisräkan har ett extremt avancerat färgseende och ett av djurvärldens snabbaste slag.",
    category: "Havsdjur",
    rarity: "Sällsynt",
  },
  {
    name: "Narval",
    emoji: "🐋",
    habitat: "Arktiska hav",
    fact: "Narvalens långa horn är egentligen en spiralformad tand full av nervändar.",
    category: "Havsdjur",
    rarity: "Sällsynt",
  },
];

const HISTORY_EVENTS = [
  {
    year: 1969,
    title: "Människan landar på månen",
    description: "Apollo 11 landade på månen och Neil Armstrong blev den första människan att sätta sin fot där.",
    emoji: "🌕",
    category: "Rymdhistoria",
  },
  {
    year: 1876,
    title: "Telefonen patenteras",
    description: "Alexander Graham Bell fick patent på en tidig version av telefonen.",
    emoji: "☎️",
    category: "Uppfinningar",
  },
  {
    year: 1912,
    title: "Titanic lämnar Southampton",
    description: "RMS Titanic påbörjade sin första och enda resa över Atlanten.",
    emoji: "🚢",
    category: "Sjöfart",
  },
  {
    year: 1989,
    title: "Berlinmuren öppnas",
    description: "Gränsövergångarna mellan Öst- och Västberlin öppnades efter årtionden av delning.",
    emoji: "🧱",
    category: "Världshistoria",
  },
  {
    year: 1903,
    title: "Första motordrivna flygningen",
    description: "Bröderna Wright genomförde den första kontrollerade flygningen med ett motordrivet flygplan.",
    emoji: "✈️",
    category: "Flyghistoria",
  },
  {
    year: 1958,
    title: "LEGO-klossen patenteras",
    description: "Den moderna LEGO-klossen med sitt kopplingssystem patenterades i Danmark.",
    emoji: "🧱",
    category: "Leksakshistoria",
  },
  {
    year: 1991,
    title: "World Wide Web blir offentligt",
    description: "Tim Berners-Lee gjorde sin webbläsare och webbserver tillgängliga för omvärlden.",
    emoji: "🌐",
    category: "Teknikhistoria",
  },
  {
    year: 1886,
    title: "Den första bilen patenteras",
    description: "Karl Benz fick patent på sitt trehjuliga motordrivna fordon.",
    emoji: "🚗",
    category: "Uppfinningar",
  },
  {
    year: 1928,
    title: "Penicillinet upptäcks",
    description: "Alexander Fleming upptäckte att mögelsvampen Penicillium kunde döda bakterier.",
    emoji: "🧫",
    category: "Medicinhistoria",
  },
  {
    year: 1977,
    title: "Voyager 1 skjuts upp",
    description: "Rymdsonden Voyager 1 skickades iväg för att studera de yttre planeterna.",
    emoji: "🛰️",
    category: "Rymdhistoria",
  },
  {
    year: 1455,
    title: "Gutenbergs bibel trycks",
    description: "En av de första stora böckerna tryckta med rörliga typer färdigställdes.",
    emoji: "📖",
    category: "Bokhistoria",
  },
  {
    year: 1971,
    title: "Det första e-postmeddelandet skickas",
    description: "Ray Tomlinson skickade ett av de första nätverksbaserade e-postmeddelandena.",
    emoji: "📧",
    category: "Teknikhistoria",
  },
];

const DAD_JOKES = [
  {
    setup: "Vad kallas en ko som spelar instrument?",
    punchline: "En muu-siker.",
    emoji: "🐄",
  },
  {
    setup: "Varför tog datorn med sig en filt?",
    punchline: "Den hade Windows öppet.",
    emoji: "💻",
  },
  {
    setup: "Vad sa den ena väggen till den andra?",
    punchline: "Vi möts i hörnet.",
    emoji: "🧱",
  },
  {
    setup: "Vad heter världens fattigaste kung?",
    punchline: "Kron-lös.",
    emoji: "👑",
  },
  {
    setup: "Varför är det svårt att lita på trappor?",
    punchline: "De är alltid ute efter något.",
    emoji: "🪜",
  },
  {
    setup: "Vad sa nollan till åttan?",
    punchline: "Snyggt bälte!",
    emoji: "8️⃣",
  },
  {
    setup: "Vad kallas en sovande tjur?",
    punchline: "En bulldozer.",
    emoji: "🐂",
  },
  {
    setup: "Varför blev cykeln trött?",
    punchline: "Den var två-hjulig.",
    emoji: "🚲",
  },
  {
    setup: "Vad sa kaffet när det kom för sent?",
    punchline: "Bättre latte än aldrig.",
    emoji: "☕",
  },
  {
    setup: "Hur vet man att en bil kommer från Norge?",
    punchline: "Den har norsk broms.",
    emoji: "🚙",
  },
  {
    setup: "Vad kallas en fisk utan ögon?",
    punchline: "Fsk.",
    emoji: "🐟",
  },
  {
    setup: "Varför gick bananen till doktorn?",
    punchline: "Den kände sig skalad.",
    emoji: "🍌",
  },
];

type IssApiResponse = {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
  timestamp: number;
};

type OpenNotifyIssResponse = {
  message: string;
  timestamp: number;
  iss_position: {
    latitude: string;
    longitude: string;
  };
};

type NasaCloseApproach = {
  close_approach_date: string;
  close_approach_date_full?: string;
  relative_velocity: {
    kilometers_per_hour: string;
  };
  miss_distance: {
    kilometers: string;
    lunar: string;
  };
};

type NasaNeo = {
  id: string;
  name: string;
  is_potentially_hazardous_asteroid: boolean;
  estimated_diameter: {
    meters: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  close_approach_data: NasaCloseApproach[];
};

type NasaFeedResponse = {
  element_count: number;
  near_earth_objects: Record<string, NasaNeo[]>;
};

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function phaseName(angle: number): string {
  if (angle < 22.5 || angle >= 337.5) return "Nymåne";
  if (angle < 67.5) return "Tilltagande skära";
  if (angle < 112.5) return "Första kvarteret";
  if (angle < 157.5) return "Tilltagande måne";
  if (angle < 202.5) return "Fullmåne";
  if (angle < 247.5) return "Avtagande måne";
  if (angle < 292.5) return "Sista kvarteret";
  return "Avtagande skära";
}

function moonEmoji(angle: number): string {
  if (angle < 22.5 || angle >= 337.5) return "🌑";
  if (angle < 67.5) return "🌒";
  if (angle < 112.5) return "🌓";
  if (angle < 157.5) return "🌔";
  if (angle < 202.5) return "🌕";
  if (angle < 247.5) return "🌖";
  if (angle < 292.5) return "🌗";
  return "🌘";
}

function compassDirection(azimuth: number): string {
  const directions = [
    "norr",
    "nordost",
    "öst",
    "sydost",
    "syd",
    "sydväst",
    "väst",
    "nordväst",
  ];

  return directions[Math.round(azimuth / 45) % 8];
}

function getDayIndex(now: Date): number {
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 0);

  return Math.floor(
    (Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ) -
      startOfYear) /
      86_400_000
  );
}

function getDailyAnimal(now: Date) {
  return ANIMALS[getDayIndex(now) % ANIMALS.length];
}

function getDailyHistoryEvent(now: Date) {
  return HISTORY_EVENTS[
    (getDayIndex(now) * 5 + now.getUTCFullYear()) %
      HISTORY_EVENTS.length
  ];
}

function getDailyDadJoke(now: Date) {
  return DAD_JOKES[
    (getDayIndex(now) * 7 + now.getUTCMonth()) %
      DAD_JOKES.length
  ];
}

function getMoonData(now: Date) {
  const phaseAngle = MoonPhase(now);
  const illumination = Illumination(Body.Moon, now);

  const nextFullMoon = SearchMoonPhase(180, now, 40);
  const nextNewMoon = SearchMoonPhase(0, now, 40);

  return {
    phaseName: phaseName(phaseAngle),
    emoji: moonEmoji(phaseAngle),
    illuminatedPercent: Math.round(
      illumination.phase_fraction * 100
    ),
    phaseAngle: Math.round(phaseAngle),
    nextFullMoon: nextFullMoon?.date.toISOString() ?? null,
    nextNewMoon: nextNewMoon?.date.toISOString() ?? null,
  };
}

function getPlanetData(now: Date) {
  const observer = new Observer(
    GOTHENBURG.latitude,
    GOTHENBURG.longitude,
    GOTHENBURG.elevationMeters
  );

  const planets = [
    { body: Body.Mercury, name: "Merkurius", emoji: "☿" },
    { body: Body.Venus, name: "Venus", emoji: "♀" },
    { body: Body.Mars, name: "Mars", emoji: "♂" },
    { body: Body.Jupiter, name: "Jupiter", emoji: "♃" },
    { body: Body.Saturn, name: "Saturnus", emoji: "♄" },
    { body: Body.Uranus, name: "Uranus", emoji: "⛢" },
    { body: Body.Neptune, name: "Neptunus", emoji: "♆" },
  ];

  return planets
    .map((planet) => {
      const equatorial = Equator(
        planet.body,
        now,
        observer,
        true,
        true
      );

      const horizontal = Horizon(
        now,
        observer,
        equatorial.ra,
        equatorial.dec,
        "normal"
      );

      const illumination = Illumination(
        planet.body,
        now
      );

      return {
        name: planet.name,
        emoji: planet.emoji,
        altitude: Number(horizontal.altitude.toFixed(1)),
        azimuth: Number(horizontal.azimuth.toFixed(1)),
        direction: compassDirection(horizontal.azimuth),
        magnitude: Number(illumination.mag.toFixed(1)),
        visible: horizontal.altitude > 0,
      };
    })
    .sort((first, second) => second.altitude - first.altitude);
}

async function getIssData() {
  try {
    const response = await fetch(
      "https://api.wheretheiss.at/v1/satellites/25544",
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "Family-Dashboard/1.0",
        },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Where the ISS at svarade med ${response.status}`
      );
    }

    const data = (await response.json()) as IssApiResponse;

    return {
      latitude: Number(data.latitude.toFixed(2)),
      longitude: Number(data.longitude.toFixed(2)),
      altitudeKm: Number(data.altitude.toFixed(1)),
      velocityKmh: Math.round(data.velocity),
      visibility: data.visibility,
      timestamp: new Date(
        data.timestamp * 1000
      ).toISOString(),
      mapsUrl: `https://www.google.com/maps?q=${data.latitude},${data.longitude}`,
      source: "Where the ISS at",
      isEstimated: false,
    };
  } catch (primaryError) {
    console.warn(
      "Primär ISS-tjänst misslyckades. Försöker med reservtjänsten:",
      primaryError
    );
  }

  const fallbackResponse = await fetch(
    "http://api.open-notify.org/iss-now.json",
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Family-Dashboard/1.0",
      },
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!fallbackResponse.ok) {
    throw new Error(
      `Open Notify svarade med ${fallbackResponse.status}`
    );
  }

  const fallbackData =
    (await fallbackResponse.json()) as OpenNotifyIssResponse;

  if (
    fallbackData.message !== "success" ||
    !fallbackData.iss_position
  ) {
    throw new Error(
      "Open Notify returnerade ett oväntat svar."
    );
  }

  const latitude = Number(
    fallbackData.iss_position.latitude
  );
  const longitude = Number(
    fallbackData.iss_position.longitude
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new Error(
      "Reservtjänsten returnerade en ogiltig ISS-position."
    );
  }

  return {
    latitude: Number(latitude.toFixed(2)),
    longitude: Number(longitude.toFixed(2)),
    altitudeKm: 420,
    velocityKmh: 27_600,
    visibility: "unknown",
    timestamp: new Date(
      fallbackData.timestamp * 1000
    ).toISOString(),
    mapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
    source: "Open Notify",
    isEstimated: true,
  };
}

async function getAsteroidData(now: Date) {
  const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
  const startDate = dateString(now);
  const endDate = dateString(
    new Date(now.getTime() + 6 * 86_400_000)
  );

  const url =
    "https://api.nasa.gov/neo/rest/v1/feed" +
    `?start_date=${startDate}` +
    `&end_date=${endDate}` +
    `&api_key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    next: {
      revalidate: 60 * 60,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `NASA-tjänsten svarade med ${response.status}`
    );
  }

  const data = (await response.json()) as NasaFeedResponse;

  const asteroids = Object.values(
    data.near_earth_objects
  )
    .flat()
    .map((asteroid) => {
      const approach = asteroid.close_approach_data[0];

      if (!approach) {
        return null;
      }

      const diameterMin =
        asteroid.estimated_diameter.meters
          .estimated_diameter_min;
      const diameterMax =
        asteroid.estimated_diameter.meters
          .estimated_diameter_max;

      return {
        id: asteroid.id,
        name: asteroid.name.replace(/[()]/g, ""),
        hazardous:
          asteroid.is_potentially_hazardous_asteroid,
        diameterMeters: Math.round(
          (diameterMin + diameterMax) / 2
        ),
        missDistanceKm: Math.round(
          Number(approach.miss_distance.kilometers)
        ),
        lunarDistances: Number(
          Number(approach.miss_distance.lunar).toFixed(1)
        ),
        velocityKmh: Math.round(
          Number(
            approach.relative_velocity
              .kilometers_per_hour
          )
        ),
        approachDate:
          approach.close_approach_date_full ||
          approach.close_approach_date,
      };
    })
    .filter(
      (
        asteroid
      ): asteroid is NonNullable<typeof asteroid> =>
        asteroid !== null
    )
    .sort(
      (first, second) =>
        first.missDistanceKm - second.missDistanceKm
    );

  return {
    totalThisWeek: data.element_count,
    nearest: asteroids[0] ?? null,
  };
}

export async function GET() {
  const now = new Date();

  const [issResult, asteroidResult] =
    await Promise.allSettled([
      getIssData(),
      getAsteroidData(now),
    ]);

  return NextResponse.json(
    {
      generatedAt: now.toISOString(),
      iss:
        issResult.status === "fulfilled"
          ? issResult.value
          : null,
      asteroid:
        asteroidResult.status === "fulfilled"
          ? asteroidResult.value
          : null,
      moon: getMoonData(now),
      planets: getPlanetData(now),
      animal: getDailyAnimal(now),
      historyEvent: getDailyHistoryEvent(now),
      dadJoke: getDailyDadJoke(now),
      errors: {
        iss:
          issResult.status === "rejected"
            ? "ISS-data kunde inte hämtas."
            : null,
        asteroid:
          asteroidResult.status === "rejected"
            ? "Asteroiddata kunde inte hämtas."
            : null,
      },
    },
    {
      headers: {
        "Cache-Control":
          "no-store, max-age=0, must-revalidate",
      },
    }
  );
}