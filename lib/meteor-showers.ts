export type MeteorShowerId =
  | "quadrantids"
  | "lyrids"
  | "eta-aquariids"
  | "southern-delta-aquariids"
  | "perseids"
  | "draconids"
  | "orionids"
  | "leonids"
  | "geminids"
  | "ursids";

export type MeteorShowerDefinition = {
  id: MeteorShowerId;
  name: string;
  emoji: string;
  radiant: string;
  parentBody: string;
  peakMonth: number;
  peakDay: number;
  activeStartOffsetDays: number;
  activeEndOffsetDays: number;
  typicalZhr: number;
  speedKmS: number;
  note: string;
};

export type MeteorShowerOccurrence = {
  id: MeteorShowerId;
  name: string;
  emoji: string;
  radiant: string;
  parentBody: string;
  typicalZhr: number;
  speedKmS: number;
  note: string;
  startDate: string;
  peakDate: string;
  endDate: string;
  isActive: boolean;
  daysUntilPeak: number;
  daysUntilStart: number;
  daysSincePeak: number;
};

export type MeteorShowerOverview = {
  today: string;
  active: MeteorShowerOccurrence[];
  upcoming: MeteorShowerOccurrence[];
  next: MeteorShowerOccurrence | null;
};

const METEOR_SHOWERS: MeteorShowerDefinition[] = [
  {
    id: "quadrantids",
    name: "Kvadrantiderna",
    emoji: "✨",
    radiant: "Bootes",
    parentBody: "2003 EH1",
    peakMonth: 1,
    peakDay: 3,
    activeStartOffsetDays: -6,
    activeEndOffsetDays: 9,
    typicalZhr: 120,
    speedKmS: 41,
    note: "Kort och ofta intensivt maximum i början av januari.",
  },
  {
    id: "lyrids",
    name: "Lyriderna",
    emoji: "🌠",
    radiant: "Lyra",
    parentBody: "C/1861 G1 Thatcher",
    peakMonth: 4,
    peakDay: 22,
    activeStartOffsetDays: -5,
    activeEndOffsetDays: 4,
    typicalZhr: 18,
    speedKmS: 49,
    note: "Ett klassiskt vårregn med ibland ljusa meteorer.",
  },
  {
    id: "eta-aquariids",
    name: "Eta-Aquariiderna",
    emoji: "☄️",
    radiant: "Aquarius",
    parentBody: "1P/Halley",
    peakMonth: 5,
    peakDay: 6,
    activeStartOffsetDays: -16,
    activeEndOffsetDays: 15,
    typicalZhr: 50,
    speedKmS: 66,
    note: "Halley-kometens stoft. Bäst från sydligare breddgrader.",
  },
  {
    id: "southern-delta-aquariids",
    name: "Södra Delta-Aquariiderna",
    emoji: "💫",
    radiant: "Aquarius",
    parentBody: "96P/Machholz-komplexet",
    peakMonth: 7,
    peakDay: 31,
    activeStartOffsetDays: -19,
    activeEndOffsetDays: 23,
    typicalZhr: 25,
    speedKmS: 41,
    note: "Lång aktivitetsperiod som överlappar Perseiderna.",
  },
  {
    id: "perseids",
    name: "Perseiderna",
    emoji: "☄️",
    radiant: "Perseus",
    parentBody: "109P/Swift-Tuttle",
    peakMonth: 8,
    peakDay: 12,
    activeStartOffsetDays: -26,
    activeEndOffsetDays: 12,
    typicalZhr: 100,
    speedKmS: 59,
    note: "Ett av årets mest populära meteorregn på norra halvklotet.",
  },
  {
    id: "draconids",
    name: "Drakoniderna",
    emoji: "🐉",
    radiant: "Draco",
    parentBody: "21P/Giacobini-Zinner",
    peakMonth: 10,
    peakDay: 8,
    activeStartOffsetDays: -2,
    activeEndOffsetDays: 2,
    typicalZhr: 10,
    speedKmS: 20,
    note: "Ovanligt genom att vara bäst på kvällen snarare än före gryning.",
  },
  {
    id: "orionids",
    name: "Orioniderna",
    emoji: "🌌",
    radiant: "Orion",
    parentBody: "1P/Halley",
    peakMonth: 10,
    peakDay: 21,
    activeStartOffsetDays: -19,
    activeEndOffsetDays: 17,
    typicalZhr: 20,
    speedKmS: 66,
    note: "Snabba meteorer från stoft efter Halleys komet.",
  },
  {
    id: "leonids",
    name: "Leoniderna",
    emoji: "🦁",
    radiant: "Leo",
    parentBody: "55P/Tempel-Tuttle",
    peakMonth: 11,
    peakDay: 17,
    activeStartOffsetDays: -14,
    activeEndOffsetDays: 15,
    typicalZhr: 15,
    speedKmS: 71,
    note: "Känd för historiska meteorstormar, men normalt betydligt lugnare.",
  },
  {
    id: "geminids",
    name: "Geminiderna",
    emoji: "💎",
    radiant: "Gemini",
    parentBody: "3200 Phaethon",
    peakMonth: 12,
    peakDay: 13,
    activeStartOffsetDays: -12,
    activeEndOffsetDays: 8,
    typicalZhr: 120,
    speedKmS: 34,
    note: "Ett av årets starkaste och mest pålitliga meteorregn.",
  },
  {
    id: "ursids",
    name: "Ursiderna",
    emoji: "🐻",
    radiant: "Ursa Minor",
    parentBody: "8P/Tuttle",
    peakMonth: 12,
    peakDay: 22,
    activeStartOffsetDays: -9,
    activeEndOffsetDays: 2,
    typicalZhr: 10,
    speedKmS: 33,
    note: "Ett mindre decemberregn med radiant nära Lilla björnen.",
  },
];

function startOfLocalDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return startOfLocalDay(result);
}

function daysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  const endUtc = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );

  return Math.round((endUtc - startUtc) / 86_400_000);
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createOccurrence(
  shower: MeteorShowerDefinition,
  peakYear: number,
  today: Date
): MeteorShowerOccurrence {
  const peak = new Date(
    peakYear,
    shower.peakMonth - 1,
    shower.peakDay
  );

  const start = addDays(
    peak,
    shower.activeStartOffsetDays
  );

  const end = addDays(
    peak,
    shower.activeEndOffsetDays
  );

  const isActive =
    today >= start &&
    today <= end;

  return {
    id: shower.id,
    name: shower.name,
    emoji: shower.emoji,
    radiant: shower.radiant,
    parentBody: shower.parentBody,
    typicalZhr: shower.typicalZhr,
    speedKmS: shower.speedKmS,
    note: shower.note,
    startDate: toDateString(start),
    peakDate: toDateString(peak),
    endDate: toDateString(end),
    isActive,
    daysUntilPeak: daysBetween(today, peak),
    daysUntilStart: daysBetween(today, start),
    daysSincePeak: daysBetween(peak, today),
  };
}

export function getMeteorShowerOverview(
  referenceDate: Date = new Date()
): MeteorShowerOverview {
  const today = startOfLocalDay(referenceDate);

  const years = [
    today.getFullYear() - 1,
    today.getFullYear(),
    today.getFullYear() + 1,
  ];

  const occurrences =
    METEOR_SHOWERS.flatMap((shower) =>
      years.map((year) =>
        createOccurrence(
          shower,
          year,
          today
        )
      )
    );

  const active = occurrences
    .filter(
      (occurrence) =>
        occurrence.isActive
    )
    .sort((first, second) => {
      const firstDistance =
        Math.abs(
          first.daysUntilPeak
        );

      const secondDistance =
        Math.abs(
          second.daysUntilPeak
        );

      return firstDistance - secondDistance;
    });

  const upcoming = occurrences
    .filter(
      (occurrence) =>
        occurrence.daysUntilStart > 0
    )
    .sort(
      (first, second) =>
        first.daysUntilStart -
        second.daysUntilStart
    );

  return {
    today: toDateString(today),
    active,
    upcoming,
    next: upcoming[0] ?? null,
  };
}

export function formatMeteorDate(
  dateString: string
): string {
  const [year, month, day] =
    dateString.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
  });
}