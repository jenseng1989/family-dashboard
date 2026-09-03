import { NextResponse } from "next/server";

export const revalidate = 5 * 60;

type UsgsFeature = {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number | null;
    updated: number | null;
    url: string | null;
    felt: number | null;
    alert: string | null;
    tsunami: number | null;
    sig: number | null;
    type: string | null;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number, number];
  } | null;
};

type UsgsResponse = {
  metadata: {
    generated: number;
  };
  features: UsgsFeature[];
};

type EarthquakeItem = {
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

const USGS_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

function toIsoString(
  timestamp: number | null
): string | null {
  if (
    typeof timestamp !== "number" ||
    !Number.isFinite(timestamp)
  ) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function toEarthquake(
  feature: UsgsFeature
): EarthquakeItem | null {
  const coordinates =
    feature.geometry?.coordinates;

  const magnitude =
    feature.properties.mag;

  const time = toIsoString(
    feature.properties.time
  );

  if (
    !coordinates ||
    typeof magnitude !== "number" ||
    !Number.isFinite(magnitude) ||
    !time
  ) {
    return null;
  }

  const [
    longitude,
    latitude,
    depthKm,
  ] = coordinates;

  return {
    id: feature.id,
    magnitude,
    place:
      feature.properties.place ??
      "Okänd plats",
    time,
    depthKm:
      Number.isFinite(depthKm)
        ? depthKm
        : 0,
    latitude:
      Number.isFinite(latitude)
        ? latitude
        : 0,
    longitude:
      Number.isFinite(longitude)
        ? longitude
        : 0,
    url:
      feature.properties.url ??
      "https://earthquake.usgs.gov/earthquakes/map/",
    tsunami:
      feature.properties.tsunami === 1,
    alert:
      feature.properties.alert,
    significance:
      feature.properties.sig,
    feltReports:
      feature.properties.felt,
  };
}

export async function GET() {
  try {
    const response = await fetch(
      USGS_URL,
      {
        headers: {
          Accept:
            "application/geo+json, application/json",
          "User-Agent":
            "Family-Dashboard/1.0",
        },
        next: {
          revalidate: 5 * 60,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `USGS svarade med status ${response.status}`
      );
    }

    const data =
      (await response.json()) as
        UsgsResponse;

    const earthquakes =
      data.features
        .filter(
          (feature) =>
            feature.properties
              .type === null ||
            feature.properties
              .type ===
              "earthquake"
        )
        .map(toEarthquake)
        .filter(
          (
            item
          ): item is EarthquakeItem =>
            item !== null
        );

    const magnitude4 =
      earthquakes.filter(
        (item) =>
          item.magnitude >= 4
      );

    const magnitude5 =
      earthquakes.filter(
        (item) =>
          item.magnitude >= 5
      );

    const magnitude6 =
      earthquakes.filter(
        (item) =>
          item.magnitude >= 6
      );

    const strongest =
      [...earthquakes].sort(
        (a, b) =>
          b.magnitude -
          a.magnitude
      )[0] ?? null;

    const latestM4 =
      [...magnitude4].sort(
        (a, b) =>
          new Date(
            b.time
          ).getTime() -
          new Date(
            a.time
          ).getTime()
      )[0] ?? null;

    const list =
      [...magnitude4]
        .sort(
          (a, b) =>
            b.magnitude -
            a.magnitude
        )
        .slice(0, 12);

    let activityLevel:
      | "Lugn"
      | "Normal"
      | "Förhöjd"
      | "Kraftig" =
      "Lugn";

    if (
      magnitude6.length >= 1
    ) {
      activityLevel =
        "Kraftig";
    } else if (
      magnitude5.length >= 3
    ) {
      activityLevel =
        "Förhöjd";
    } else if (
      magnitude4.length >= 10
    ) {
      activityLevel =
        "Normal";
    }

    return NextResponse.json(
      {
        generatedAt:
          new Date(
            data.metadata
              .generated
          ).toISOString(),
        source: "USGS",
        periodHours: 24,
        summary: {
          totalEarthquakes:
            earthquakes.length,
          magnitude4:
            magnitude4.length,
          magnitude5:
            magnitude5.length,
          magnitude6:
            magnitude6.length,
          largest:
            strongest,
          latestM4,
          activityLevel,
        },
        earthquakes: list,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error(
      "Kunde inte hämta jordbävningsdata från USGS:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Jordbävningsdata kunde inte hämtas.",
      },
      {
        status: 500,
      }
    );
  }
}
