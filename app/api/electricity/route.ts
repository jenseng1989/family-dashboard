import { getElectricityPrices } from "@/lib/electricity";

export const revalidate = 900;

type ElectricityPayload = Awaited<
  ReturnType<typeof getElectricityPrices>
>;

const NORMAL_CACHE_TTL_MS = 15 * 60 * 1000;
const MISSING_TOMORROW_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedData: ElectricityPayload | null = null;
let cachedAt = 0;
let inFlight: Promise<ElectricityPayload> | null = null;

function getCacheTtl(data: ElectricityPayload | null) {
  if (
    data &&
    Array.isArray(data.tomorrowPrices) &&
    data.tomorrowPrices.length === 0
  ) {
    return MISSING_TOMORROW_CACHE_TTL_MS;
  }

  return NORMAL_CACHE_TTL_MS;
}

function cacheIsFresh() {
  if (!cachedData) {
    return false;
  }

  return (
    Date.now() - cachedAt <
    getCacheTtl(cachedData)
  );
}

async function loadElectricity() {
  if (cacheIsFresh() && cachedData) {
    return cachedData;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = getElectricityPrices("SE3");

  try {
    const data = await inFlight;

    cachedData = data;
    cachedAt = Date.now();

    return data;
  } finally {
    inFlight = null;
  }
}

export async function GET() {
  try {
    const data = await loadElectricity();
    const hasTomorrow =
      Array.isArray(data.tomorrowPrices) &&
      data.tomorrowPrices.length > 0;

    return Response.json(data, {
      headers: {
        "Cache-Control": hasTomorrow
          ? "public, s-maxage=900, stale-while-revalidate=900"
          : "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error(
      "Kunde inte hämta elpriser:",
      error
    );

    if (cachedData) {
      return Response.json(
        {
          ...cachedData,
          stale: true,
        },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }

    return Response.json(
      {
        error: "Kunde inte hämta elpriser",
      },
      {
        status: 500,
      }
    );
  }
}
