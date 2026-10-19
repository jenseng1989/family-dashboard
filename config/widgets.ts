import {
  Activity,
  Bath,
  CalendarClock,
  CalendarDays,
  CloudSun,
  Coins,
  Gauge,
  GraduationCap,
  Utensils,
  Globe2,
  Home,
  ListChecks,
  MapPin,
  Plane,
  HousePlus,
  BedDouble,
  Wallet,
  Route,
  Bus,
  Moon,
  Orbit,
  ReceiptText,
  Rocket,
  Satellite,
  ShoppingCart,
  Sparkles,
  Sun,
  Telescope,
  TramFront,
  Users,
  Wind,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { WidgetSize } from "@/lib/widget-settings";

export type WidgetItem = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  defaultSize: WidgetSize;
  dashboardClassName?: string;
};

export type WidgetGroup = {
  key: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  widgets: WidgetItem[];
};

export const widgetGroups: WidgetGroup[] = [
  {
    key: "start-everyday",
    title: "Start · Idag",
    subtitle: "Innehållet kommer från EverydayOverview.",
    icon: Home,
    widgets: [
      {
        id: "everyday-overview",
        name: "Idag-översikt",
        description: "Samlad översikt för idag.",
        icon: Gauge,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
    ],
  },
  {
    key: "start-home",
    title: "Start · Hemmet",
    icon: Home,
    widgets: [
      {
        id: "google-calendar",
        name: "Kalender",
        description: "Kommande händelser från familjens valda Google-kalender.",
        icon: CalendarDays,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
      {
        id: "vacation-plan",
        name: "Dagsplanering",
        description: "Planering av dagen.",
        icon: CalendarClock,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
      {
        id: "countdown",
        name: "Nedräkning",
        description: "Nedräkningar till kommande datum.",
        icon: CalendarClock,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
      {
        id: "electricity",
        name: "Elpris",
        description: "Aktuella elpriser och prisutveckling.",
        icon: Coins,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
    ],
  },
  {
    key: "start-shopping",
    title: "Start · Inköp",
    icon: ShoppingCart,
    widgets: [
      {
        id: "shopping-list",
        name: "Inköpslista",
        description: "Familjens gemensamma inköpslista.",
        icon: ListChecks,
        defaultSize: "half",
        dashboardClassName: "col-span-12 min-w-0 xl:col-span-6",
      },
      {
        id: "expenses",
        name: "Utgifter",
        description: "Översikt och registrering av utgifter.",
        icon: ReceiptText,
        defaultSize: "half",
        dashboardClassName: "col-span-12 min-w-0 xl:col-span-6",
      },
    ],
  },
  {
    key: "start-school",
    title: "Start · Skola",
    subtitle: "Förberedda widgetar utan ansluten skoldata.",
    icon: GraduationCap,
    widgets: [
      {
        id: "school-schedule",
        name: "Skolschema",
        description: "Veckans skolschema när funktionen aktiveras.",
        icon: CalendarDays,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
      {
        id: "school-lunch",
        name: "Skollunch",
        description: "Veckans skollunch när funktionen aktiveras.",
        icon: Utensils,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
    ],
  },
  {
    key: "weather",
    title: "Väder",
    icon: CloudSun,
    widgets: [
      {
        id: "weather",
        name: "Väder",
        description: "Aktuellt väder och prognos.",
        icon: CloudSun,
        defaultSize: "half",
        dashboardClassName: "col-span-12 min-w-0 xl:col-span-6",
      },
      {
        id: "gothenburg-air-quality",
        name: "Luftkvalitet",
        description: "Aktuell luftkvalitet i Göteborg.",
        icon: Wind,
        defaultSize: "half",
        dashboardClassName: "col-span-12 min-w-0 xl:col-span-6",
      },
      {
        id: "pollen",
        name: "Pollen",
        description: "Aktuellt pollenläge.",
        icon: Wind,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
    ],
  },
  {
    key: "family-shared",
    title: "Familjen · Gemensam",
    icon: Users,
    widgets: [
      {
        id: "family-timeline",
        name: "Family Timeline",
        description: "Familjens gemensamma tidslinje.",
        icon: Users,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
    ],
  },
  {
    key: "gothenburg",
    title: "Göteborg",
    subtitle: "Widgets på huvudfliken Göteborg.",
    icon: MapPin,
    widgets: [
      {
        id: "gothenburg-today",
        name: "Göteborg idag",
        description: "Dagens utvalda evenemang och lokala tips i Göteborg.",
        icon: Sparkles,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
      {
        id: "gothenburg-events",
        name: "Evenemang · 7 dagar",
        description: "Evenemang i Göteborg från imorgon och sju dagar framåt.",
        icon: CalendarClock,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
      {
        id: "gothenburg-vasttrafik",
        name: "Västtrafik",
        description: "Avgångar och kollektivtrafik i Göteborg.",
        icon: TramFront,
        defaultSize: "half",
        dashboardClassName: "col-span-12 min-w-0 xl:col-span-6",
      },
      {
        id: "bathing",
        name: "Badtemperaturer",
        description: "Badplatser och aktuella temperaturer.",
        icon: Bath,
        defaultSize: "half",
        dashboardClassName: "col-span-12 min-w-0 xl:col-span-6",
      },
    ],
  },
  {
    key: "explore-space",
    title: "Utforska · Rymden",
    subtitle: "Widgets på underfliken Rymden.",
    icon: Rocket,
    widgets: [
      {
        id: "space-tonight",
        name: "Ikväll i Göteborg",
        description: "Astronomisk översikt för kvällen i Göteborg.",
        icon: Telescope,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
      {
        id: "space-solar-activity",
        name: "Solaktivitet",
        description: "Aktuell solaktivitet och rymdväder.",
        icon: Sun,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
      {
        id: "space-meteor-showers",
        name: "Meteorregn",
        description: "Aktuella och kommande meteorregn.",
        icon: Sparkles,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
      {
        id: "space-iss",
        name: "Var är ISS?",
        description: "ISS-position och information i realtid.",
        icon: Rocket,
        defaultSize: "half",
        dashboardClassName: "col-span-12 min-w-0 xl:col-span-6",
      },
      {
        id: "space-asteroids",
        name: "Asteroidvarning",
        description: "Närgångna asteroider och aktuell riskinformation.",
        icon: Orbit,
        defaultSize: "half",
        dashboardClassName: "col-span-12 min-w-0 xl:col-span-6",
      },
      {
        id: "space-moon",
        name: "Månfaser",
        description: "Aktuell månfas och kommande full- och nymåne.",
        icon: Moon,
        defaultSize: "half",
        dashboardClassName: "col-span-12 min-w-0 xl:col-span-6",
      },
      {
        id: "space-planets",
        name: "Planetguide",
        description: "Synliga planeter och deras positioner.",
        icon: Telescope,
        defaultSize: "half",
        dashboardClassName: "col-span-12 min-w-0 xl:col-span-6",
      },
      {
        id: "space-satellites",
        name: "Satelliter",
        description: "Satellitpassager över Göteborg.",
        icon: Satellite,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
    ],
  },
  {
    key: "explore-earth",
    title: "Utforska · Jorden",
    subtitle: "Widgets på underfliken Jorden.",
    icon: Globe2,
    widgets: [
      {
        id: "earth-volcanoes",
        name: "Pågående vulkanutbrott",
        description: "Aktuella pågående vulkanutbrott från Smithsonian.",
        icon: Activity,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
      {
        id: "earth-earthquakes",
        name: "Jordbävningar",
        description: "De starkaste jordbävningarna under det senaste dygnet.",
        icon: Globe2,
        defaultSize: "full",
        dashboardClassName: "col-span-12 min-w-0",
      },
    ],
  },
  {
    key: "resor",
    title: "Resor",
    subtitle: "Planeringspaneler för varje resa.",
    icon: Plane,
    widgets: [
      { id: "resor-overview-upcoming", name: "Kommande resor", description: "Planerade och bokade resor på reseöversikten.", icon: CalendarDays, defaultSize: "full" },
      { id: "resor-overview-idea", name: "Reseidéer", description: "Idéer för framtida resor på reseöversikten.", icon: Lightbulb, defaultSize: "full" },
      { id: "resor-overview-past", name: "Tidigare resor", description: "Genomförda resor på reseöversikten.", icon: CheckCircle2, defaultSize: "full" },
      { id: "resor-itinerary", name: "Resplan", description: "Resans dag-för-dag-planering.", icon: Route, defaultSize: "half" },
      { id: "resor-transport", name: "Transport", description: "Flyg, tåg, färja, buss och bil.", icon: Bus, defaultSize: "half" },
      { id: "resor-accommodation", name: "Boende", description: "Resans boenden och bokningar.", icon: BedDouble, defaultSize: "half" },
      { id: "resor-activities", name: "Aktiviteter", description: "Utflykter och aktiviteter.", icon: CalendarDays, defaultSize: "half" },
      { id: "resor-budget", name: "Budget", description: "Resans kostnader och budget.", icon: Wallet, defaultSize: "half" },
    ],
  },
  {
    key: "hemmet3d",
    title: "Smarthem",
    subtitle: "3D-modell och enhetsstyrning.",
    icon: HousePlus,
    widgets: [
      { id: "hemmet3d-viewer", name: "3D-modell och enhetsstyrning", description: "Rum, smarta enheter, lampor och ljusscener.", icon: HousePlus, defaultSize: "full" },
    ],
  },
];

export function getWidgetGroup(key: string) {
  const group = widgetGroups.find((item) => item.key === key);

  if (!group) {
    throw new Error(`Okänd widgetgrupp: ${key}`);
  }

  return group;
}


export type DynamicFamilyWidgetTemplate = {
  suffix: string;
  dashboardClassName: string;
};

export const adultFamilyWidgetTemplates: DynamicFamilyWidgetTemplate[] = [
  {
    suffix: "todos",
    dashboardClassName: "col-span-12 min-w-0",
  },
  {
    suffix: "notes",
    dashboardClassName: "col-span-12 min-w-0",
  },
];

export const childFamilyWidgetTemplates: DynamicFamilyWidgetTemplate[] = [
  {
    suffix: "growth",
    dashboardClassName: "col-span-12 min-w-0",
  },
  {
    suffix: "weight",
    dashboardClassName: "col-span-12 min-w-0",
  },
  {
    suffix: "height",
    dashboardClassName: "col-span-12 min-w-0",
  },
  {
    suffix: "teeth",
    dashboardClassName: "col-span-12 min-w-0",
  },
  {
    suffix: "vaccinations",
    dashboardClassName: "col-span-12 min-w-0",
  },
  {
    suffix: "history",
    dashboardClassName: "col-span-12 min-w-0",
  },
];

export const exploreTabWidgetIds = {
  space: "fun-space",
  earth: "fun-other",
} as const;
