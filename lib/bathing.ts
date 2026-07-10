export type BathingPlace = {
  name: string;
  municipality: string;
  temperature: number | null;
  warning: string | null;
  url: string | null;
};

export type BathingData = {
  municipality: string;
  updatedAt: string;
  places: BathingPlace[];
};

export function formatBathingTemperature(
  temperature: number | null
): string {
  if (temperature === null) {
    return "Ingen temperatur";
  }

  return `${temperature.toFixed(1).replace(".", ",")} °C`;
}

export function getBathingTemperatureLevel(
  temperature: number | null
): "warm" | "medium" | "cold" | "unknown" {
  if (temperature === null) {
    return "unknown";
  }

  if (temperature >= 20) {
    return "warm";
  }

  if (temperature >= 17) {
    return "medium";
  }

  return "cold";
}