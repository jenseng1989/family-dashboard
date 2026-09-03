export type EarthquakeItem = {
  id: string;
  magnitude: number;
  place: string;
  time: string;
  depthKm: number;
  latitude: number;
  longitude: number;
  url: string;
  tsunami: boolean;
  alert: string | null;
  significance: number | null;
  feltReports: number | null;
};

export type EarthData = {
  generatedAt: string;
  source: string;
  periodHours: number;
  summary: {
    totalEarthquakes: number;
    magnitude4: number;
    magnitude5: number;
    magnitude6: number;
    largest: EarthquakeItem | null;
    latestM4: EarthquakeItem | null;
    activityLevel:
      | "Lugn"
      | "Normal"
      | "Förhöjd"
      | "Kraftig";
  };
  earthquakes: EarthquakeItem[];
};

export type VolcanoItem = {
  name: string;
  country: string;
  eruptionStart: string;
  lastKnownActivity: string;
  eruptionType: string;
  url: string;
  distanceKm: number;
};

export type VolcanoData = {
  generatedAt: string;
  source: string;
  sourceUrl: string;
  statusDate: string | null;
  total: number;
  volcanoes: VolcanoItem[];
};
