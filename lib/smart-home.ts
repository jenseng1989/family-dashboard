export type SmartHomeRoomIcon = "living-room" | "kitchen" | "bedroom";
export type SmartHomeDeviceType = "light" | "speaker";
export type SmartHomeSceneIcon = "cozy" | "night" | "power-off";

export type SmartHomeDevice = {
  id: string;
  roomId: string;
  name: string;
  type: SmartHomeDeviceType;
  online: boolean;
  isOn: boolean;
  brightness?: number;
  status?: string;
};

export type SmartHomeRoom = {
  id: string;
  name: string;
  icon: SmartHomeRoomIcon;
  temperatureC: number | null;
  status: string;
  online: boolean;
};

export type SmartHomeScene = {
  id: string;
  name: string;
  description: string;
  icon: SmartHomeSceneIcon;
  enabled: boolean;
};

export type SmartHomeData = {
  mode: "demo" | "live";
  statusMessage: string;
  warningCount: number;
  rooms: SmartHomeRoom[];
  devices: SmartHomeDevice[];
  scenes: SmartHomeScene[];
};

export type SmartHomeSummary = {
  roomCount: number;
  lightsOn: number;
  lightsTotal: number;
  speakersOn: number;
  speakersTotal: number;
  averageTemperatureC: number | null;
  warningCount: number;
};

export const smartHomeDemoData: SmartHomeData = {
  mode: "demo",
  statusMessage: "Smarthem är redo",
  warningCount: 0,
  rooms: [
    { id: "living-room", name: "Vardagsrum", icon: "living-room", temperatureC: null, status: "3 smarta enheter", online: true },
    { id: "kitchen", name: "Kök", icon: "kitchen", temperatureC: null, status: "2 smarta enheter", online: true },
    { id: "bedroom", name: "Sovrum", icon: "bedroom", temperatureC: null, status: "2 smarta enheter", online: true },
  ],
  devices: [
    { id: "living-ceiling", roomId: "living-room", name: "Taklampa", type: "light", online: true, isOn: true, brightness: 75 },
    { id: "living-window", roomId: "living-room", name: "Fönsterlampa", type: "light", online: true, isOn: true, brightness: 55 },
    { id: "living-speaker", roomId: "living-room", name: "Högtalare", type: "speaker", online: true, isOn: false, status: "Pausad" },
    { id: "kitchen-ceiling", roomId: "kitchen", name: "Taklampa", type: "light", online: true, isOn: true, brightness: 90 },
    { id: "kitchen-speaker", roomId: "kitchen", name: "Högtalare", type: "speaker", online: true, isOn: false, status: "Pausad" },
    { id: "bedroom-ceiling", roomId: "bedroom", name: "Taklampa", type: "light", online: true, isOn: false, brightness: 40 },
    { id: "bedroom-bedside", roomId: "bedroom", name: "Sänglampa", type: "light", online: true, isOn: false, brightness: 30 },
  ],
  scenes: [
    { id: "cozy", name: "Mys", description: "Dämpa belysningen i vardagsrummet.", icon: "cozy", enabled: false },
    { id: "good-night", name: "God natt", description: "Släck hemmet och lämna vald nattbelysning.", icon: "night", enabled: false },
    { id: "all-off", name: "Släck allt", description: "Släck all ansluten belysning.", icon: "power-off", enabled: false },
  ],
};

export async function getSmartHomeData(): Promise<SmartHomeData> {
  try {
    const response = await fetch("/api/smart-home", { cache: "no-store" });
    if (!response.ok) return smartHomeDemoData;
    return (await response.json()) as SmartHomeData;
  } catch {
    return smartHomeDemoData;
  }
}

export function getSmartHomeSummary(data: SmartHomeData): SmartHomeSummary {
  const lights = data.devices.filter((device) => device.type === "light");
  const speakers = data.devices.filter((device) => device.type === "speaker");
  const temperatures = data.rooms.map((room) => room.temperatureC).filter((temperature): temperature is number => temperature !== null);
  const averageTemperatureC = temperatures.length > 0
    ? temperatures.reduce((sum, temperature) => sum + temperature, 0) / temperatures.length
    : null;

  return {
    roomCount: data.rooms.length,
    lightsOn: lights.filter((device) => device.isOn).length,
    lightsTotal: lights.length,
    speakersOn: speakers.filter((device) => device.isOn).length,
    speakersTotal: speakers.length,
    averageTemperatureC,
    warningCount: data.warningCount,
  };
}

export function formatTemperature(temperatureC: number | null): string {
  if (temperatureC === null) return "–";
  return `${temperatureC.toFixed(1).replace(".", ",")} °C`;
}
