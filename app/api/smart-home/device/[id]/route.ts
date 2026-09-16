type DeviceCommand = {
  isOn?: boolean;
  brightness?: number;
};

const BRIDGE_URL =
  process.env.TRADFRI_BRIDGE_URL ?? "http://127.0.0.1:4310";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as DeviceCommand;

    const response = await fetch(
      `${BRIDGE_URL}/devices/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
      }
    );

    const data = await response.json();

    return Response.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Smart Home device command failed:", error);

    return Response.json(
      {
        ok: false,
        error: "Kunde inte kontakta Smarthemsbryggan.",
      },
      {
        status: 503,
      }
    );
  }
}