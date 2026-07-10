import ICAL from "ical.js";

export async function GET() {
  try {
    const icsUrl = process.env.CALENDAR_ICS_URL;

    if (!icsUrl) {
      return Response.json({
        error: "CALENDAR_ICS_URL saknas",
        events: [],
      });
    }

    const response = await fetch(icsUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json({
        error: "Kunde inte hämta ICS-länk",
        status: response.status,
        statusText: response.statusText,
        events: [],
      });
    }

    const icsText = await response.text();

    return Response.json({
      hasUrl: true,
      status: response.status,
      length: icsText.length,
      preview: icsText.slice(0, 200),
    });
  } catch (error) {
    return Response.json(
      {
        error: "Kalenderfel",
        message: error instanceof Error ? error.message : "Okänt fel",
        events: [],
      },
      { status: 500 }
    );
  }
}