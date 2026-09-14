export type SmartHomeRoomIcon =
  | "living-room"
  | "kitchen"
  | "bedroom";

export type SmartHomeSceneIcon =
  | "cozy"
  | "night"
  | "power-off";

export type SmartHomeRoom = {
  id: string;
  name: string;
  icon: SmartHomeRoomIcon;
  temperatureC: number | null;
  lightsOn: number;
  lightsTotal: number;
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
  scenes: SmartHomeScene[];
};

export type SmartHomeSummary = {
  roomCount: number;
  lightsOn: number;
  lightsTotal: number;
  averageTemperatureC: number | null;
  warningCount: number;
};

export const smartHomeDemoData: SmartHomeData = {
  mode: "demo",
  statusMessage: "Allt ser bra ut hemma",
  warningCount: 0,
  rooms: [
    {
      id: "living-room",
      name: "Vardagsrum",
      icon: "living-room",
      temperatureC: 21.6,
      lightsOn: 3,
      lightsTotal: 4,
      status: "Allt ser bra ut",
      online: true,
    },
    {
      id: "kitchen",
      name: "Kök",
      icon: "kitchen",
      temperatureC: 21.2,
      lightsOn: 1,
      lightsTotal: 3,
      status: "Diskmaskin redo",
      online: true,
    },
    {
      id: "bedroom",
      name: "Sovrum",
      icon: "bedroom",
      temperatureC: 20.4,
      lightsOn: 0,
      lightsTotal: 2,
      status: "Lugnt",
      online: true,
    },
  ],
  scenes: [
    {
      id: "cozy",
      name: "Mys",
      description: "Dämpad belysning i vardagsrummet.",
      icon: "cozy",
      enabled: false,
    },
    {
      id: "good-night",
      name: "God natt",
      description:
        "Släck hemmet och lämna nattbelysning.",
      icon: "night",
      enabled: false,
    },
    {
      id: "all-off",
      name: "Släck allt",
      description: "Släck all ansluten belysning.",
      icon: "power-off",
      enabled: false,
    },
  ],
};

export function getSmartHomeData(): SmartHomeData {
  return smartHomeDemoData;
}

export function getSmartHomeSummary(
  data: SmartHomeData
): SmartHomeSummary {
  const temperatures = data.rooms
    .map((room) => room.temperatureC)
    .filter(
      (temperature): temperature is number =>
        temperature !== null
    );

  const averageTemperatureC =
    temperatures.length > 0
      ? temperatures.reduce(
          (sum, temperature) =>
            sum + temperature,
          0
        ) / temperatures.length
      : null;

  return {
    roomCount: data.rooms.length,
    lightsOn: data.rooms.reduce(
      (sum, room) =>
        sum + room.lightsOn,
      0
    ),
    lightsTotal: data.rooms.reduce(
      (sum, room) =>
        sum + room.lightsTotal,
      0
    ),
    averageTemperatureC,
    warningCount: data.warningCount,
  };
}

export function formatTemperature(
  temperatureC: number | null
): string {
  if (temperatureC === null) {
    return "–";
  }

  return `${temperatureC
    .toFixed(1)
    .replace(".", ",")} °C`;
}
