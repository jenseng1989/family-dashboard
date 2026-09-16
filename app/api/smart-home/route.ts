
import {
  smartHomeDemoData,
  type SmartHomeData,
  type SmartHomeDevice,
} from "@/lib/smart-home";

export const dynamic = "force-dynamic";

const BRIDGE_URL =
  process.env.TRADFRI_BRIDGE_URL ?? "http://127.0.0.1:4310";

type BridgeHealth = {
  ok: boolean;
  service: string;
  status: string;
  tradfriConnected: boolean;
  timestamp: string;
};

type BridgeDevicesResponse = {
  ok: boolean;
  mode: "demo" | "live";
  devices: SmartHomeDevice[];
  timestamp: string;
};

async function getBridgeHealth(): Promise<BridgeHealth | null> {
  try {
    const response = await fetch(`${BRIDGE_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as BridgeHealth;
  } catch {
    return null;
  }
}

async function getBridgeDevices(): Promise<BridgeDevicesResponse | null> {
  try {
    const response = await fetch(`${BRIDGE_URL}/devices`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as BridgeDevicesResponse;
  } catch {
    return null;
  }
}

function getOfflineData(): SmartHomeData {
  return {
    ...smartHomeDemoData,

    mode: "demo",

    statusMessage: "Smarthemsbryggan är offline",

    warningCount: 1,

    rooms: smartHomeDemoData.rooms.map((room) => ({
      ...room,
      online: false,
      status: "Bryggan är offline",
    })),

    devices: smartHomeDemoData.devices.map((device) => ({
      ...device,
      online: false,
      isOn: false,
      status: "Bryggan är offline",
    })),

    scenes: smartHomeDemoData.scenes.map((scene) => ({
      ...scene,
      enabled: false,
    })),
  };
}

export async function GET() {
  const [health, bridgeDevices] = await Promise.all([
    getBridgeHealth(),
    getBridgeDevices(),
  ]);

  /*
   * Bryggan är inte tillgänglig.
   *
   * Vi visar offline-status i stället för att låtsas
   * att testlamporna fortfarande är anslutna.
   */
  if (!health?.ok || !bridgeDevices?.ok) {
    return Response.json(getOfflineData());
  }

  /*
   * Bryggan fungerar.
   *
   * Testdata används fortfarande för rum och scener.
   * Enheterna hämtas från bryggan.
   */
  const data: SmartHomeData = {
    ...smartHomeDemoData,

    mode: health.tradfriConnected ? "live" : "demo",

    statusMessage: health.tradfriConnected
      ? "TRÅDFRI är ansluten"
      : "Smarthemsbryggan är ansluten",

    warningCount: 0,

    devices: bridgeDevices.devices,
  };

  return Response.json(data);
}