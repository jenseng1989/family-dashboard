import { getElectricityPrices } from "@/lib/electricity";

export const revalidate = 900;

type ElectricityPayload = Awaited<
  ReturnType<typeof getElectricityPrices>
>;

const MEMORY_CACHE_TTL_MS =
  15 * 60 * 1000;

let cachedData:
  ElectricityPayload | null =
  null;

let cachedAt = 0;

let inFlight:
  Promise<ElectricityPayload> | null =
  null;

function cacheIsFresh() {
  return (
    cachedData !== null &&
    Date.now() - cachedAt <
      MEMORY_CACHE_TTL_MS
  );
}

async function loadElectricity() {
  if (
    cacheIsFresh() &&
    cachedData
  ) {
    return cachedData;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = getElectricityPrices(
    "SE3"
  );

  try {
    const data =
      await inFlight;

    cachedData = data;
    cachedAt = Date.now();

    return data;
  } finally {
    inFlight = null;
  }
}

export async function GET() {
  try {
    const data =
      await loadElectricity();

    return Response.json(
      data,
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=900, stale-while-revalidate=900",
        },
      }
    );
  } catch (error) {
    console.error(
      "Kunde inte hämta elpriser:",
      error
    );

    /*
     * Om den externa källan tillfälligt
     * misslyckas använder vi senast
     * lyckade svar om det finns.
     */
    if (cachedData) {
      return Response.json(
        {
          ...cachedData,
          stale: true,
        },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=60, stale-while-revalidate=900",
          },
        }
      );
    }

    return Response.json(
      {
        error:
          "Kunde inte hämta elpriser",
      },
      {
        status: 500,
      }
    );
  }
}
