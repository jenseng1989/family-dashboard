import { NextResponse } from "next/server";

export const revalidate = 1800;

type SatelliteDefinition = {
  id: number;
  displayName: string;
  emoji: string;
  description: string;
};

type N2yoPass = {
  startAzCompass: string;
  startUTC: number;
  maxAzCompass: string;
  maxEl: number;
  maxUTC: number;
  endAzCompass: string;
  endUTC: number;
  mag: number;
  duration: number;
};

type N2yoResponse = {
  info?: {
    satname?: string;
  };
  passes?: N2yoPass[];
  error?: string;
};

const GOTHENBURG = {
  latitude: 57.7089,
  longitude: 11.9746,
  altitudeMeters: 10,
};

const PREDICTION_DAYS = 7;
const MIN_VISIBILITY_SECONDS = 60;

const SATELLITES: SatelliteDefinition[] = [
  {
    id: 25544,
    displayName: "ISS",
    emoji: "🛰️",
    description: "Internationella rymdstationen",
  },
  {
    id: 48274,
    displayName: "Tiangong",
    emoji: "🇨🇳",
    description: "Kinas rymdstation",
  },
  {
    id: 20580,
    displayName: "Hubble",
    emoji: "🔭",
    description: "Hubble Space Telescope",
  },
  {
    id: 33591,
    displayName: "NOAA 19",
    emoji: "🌦️",
    description: "Vädersatellit i polär bana",
  },
];

function getSatelliteUrl(
  satelliteId: number,
  apiKey: string
): string {
  return (
    "https://api.n2yo.com/rest/v1/satellite/visualpasses/" +
    `${satelliteId}/` +
    `${GOTHENBURG.latitude}/` +
    `${GOTHENBURG.longitude}/` +
    `${GOTHENBURG.altitudeMeters}/` +
    `${PREDICTION_DAYS}/` +
    `${MIN_VISIBILITY_SECONDS}/` +
    `&apiKey=${encodeURIComponent(apiKey)}`
  );
}

async function getSatellitePass(
  satellite: SatelliteDefinition,
  apiKey: string
) {
  const response = await fetch(
    getSatelliteUrl(satellite.id, apiKey),
    {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 1800,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `N2YO svarade med status ${response.status}`
    );
  }

  const data = (await response.json()) as N2yoResponse;

  if (data.error) {
    throw new Error(data.error);
  }

  const nextPass =
    Array.isArray(data.passes) && data.passes.length > 0
      ? data.passes[0]
      : null;

  return {
    id: satellite.id,
    name: satellite.displayName,
    apiName: data.info?.satname ?? satellite.displayName,
    emoji: satellite.emoji,
    description: satellite.description,
    n2yoUrl: `https://www.n2yo.com/satellite/?s=${satellite.id}`,
    nextPass: nextPass
      ? {
          startUTC: nextPass.startUTC,
          maxUTC: nextPass.maxUTC,
          endUTC: nextPass.endUTC,
          durationSeconds: nextPass.duration,
          maxElevation: nextPass.maxEl,
          startDirection: nextPass.startAzCompass,
          maxDirection: nextPass.maxAzCompass,
          endDirection: nextPass.endAzCompass,
          magnitude:
            nextPass.mag === 100000 ? null : nextPass.mag,
        }
      : null,
  };
}

export async function GET() {
  const apiKey = process.env.N2YO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "N2YO_API_KEY saknas i serverns miljövariabler.",
      },
      { status: 500 }
    );
  }

  const results = await Promise.allSettled(
    SATELLITES.map((satellite) =>
      getSatellitePass(satellite, apiKey)
    )
  );

  const satellites = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    console.error(
      `Kunde inte hämta ${SATELLITES[index].displayName}:`,
      result.reason
    );

    return {
      id: SATELLITES[index].id,
      name: SATELLITES[index].displayName,
      apiName: SATELLITES[index].displayName,
      emoji: SATELLITES[index].emoji,
      description: SATELLITES[index].description,
      n2yoUrl: `https://www.n2yo.com/satellite/?s=${SATELLITES[index].id}`,
      nextPass: null,
      error: "Kunde inte hämta passage.",
    };
  });

  return NextResponse.json(
    {
      location: "Göteborg",
      predictionDays: PREDICTION_DAYS,
      generatedAt: new Date().toISOString(),
      satellites,
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=1800, stale-while-revalidate=1800",
      },
    }
  );
}
