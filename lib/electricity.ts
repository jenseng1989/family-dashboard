export type ElectricityPrice = {
  SEK_per_kWh: number;
  EUR_per_kWh: number;
  EXR: number;
  time_start: string;
  time_end: string;
};

export type ElectricityData = {
  area: "SE1" | "SE2" | "SE3" | "SE4";
  currentPrice: ElectricityPrice | null;
  minPrice: ElectricityPrice;
  maxPrice: ElectricityPrice;
  averagePrice: number;
  prices: ElectricityPrice[];
};

export async function getElectricityPrices(
  area: ElectricityData["area"] = "SE3"
): Promise<ElectricityData> {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const url = `https://www.elprisetjustnu.se/api/v1/prices/${year}/${month}-${day}_${area}.json`;

  const response = await fetch(url, {
    next: {
      revalidate: 900,
    },
  });

  if (!response.ok) {
    throw new Error("Kunde inte hämta elpriser");
  }

  const prices = (await response.json()) as ElectricityPrice[];

  const currentPrice =
    prices.find((price) => {
      const start = new Date(price.time_start);
      const end = new Date(price.time_end);

      return now >= start && now < end;
    }) ?? null;

  const minPrice = prices.reduce((min, price) =>
    price.SEK_per_kWh < min.SEK_per_kWh ? price : min
  );

  const maxPrice = prices.reduce((max, price) =>
    price.SEK_per_kWh > max.SEK_per_kWh ? price : max
  );

  const averagePrice =
    prices.reduce((sum, price) => sum + price.SEK_per_kWh, 0) / prices.length;

  return {
    area,
    currentPrice,
    minPrice,
    maxPrice,
    averagePrice,
    prices,
  };
}

export function formatPrice(price: number): string {
  return price.toFixed(2).replace(".", ",");
}

export function formatHour(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}