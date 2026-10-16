/**
 * Gemensamt gränssnitt för lampstyrning i Hemmet 3D.
 * H3.2: Endast lokal demo. Ingen nätverksanslutning eller Home Assistant-token.
 *
 * Framtida implementation kan ersätta demo-adaptern med ett serverbaserat
 * integrationslager. Anropa aldrig Home Assistant direkt från webbläsaren.
 */
export type LightState = { on: boolean; brightness: number };
export type LightUpdate = Partial<LightState>;
export type LightStates = Record<string, LightState>;

/** Gemensam enhetsmodell för 3D-vyn och framtida integrationsadaptrar. */
export type DeviceType = "light" | "sensor" | "speaker" | "other";
export type SmartDevice = {
  id: string;
  name: string;
  type: DeviceType;
  roomId: string;
  manufacturer: string;
  entityId: string;
  x: number;
  z: number;
};
export type LightScene = { id: string; name: string; lights: LightStates };

export const DEVICE_TYPES: { value: DeviceType; label: string; symbol: string }[] = [
  { value: "light", label: "Lampa", symbol: "💡" },
  { value: "sensor", label: "Sensor", symbol: "🌡️" },
  { value: "speaker", label: "Högtalare", symbol: "🔊" },
  { value: "other", label: "Annan enhet", symbol: "⌂" },
];


export type ControlMode = "demo" | "home-assistant";

export interface LightController {
  readonly mode: ControlMode;
  updateLight(current: LightStates, deviceId: string, change: LightUpdate): LightStates;
  updateRoom(current: LightStates, deviceIds: string[], change: LightUpdate): LightStates;
  applyScene(current: LightStates, deviceIds: string[], saved: LightStates): LightStates;
}

export const DEFAULT_LIGHT_STATE: LightState = { on: false, brightness: 65 };

export function normalizeBrightness(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(100, Math.round(value))) : 65;
}

function mergeLight(current: LightState | undefined, change: LightUpdate): LightState {
  const merged = { ...(current ?? DEFAULT_LIGHT_STATE), ...change };
  return { on: Boolean(merged.on), brightness: normalizeBrightness(merged.brightness) };
}

/** Synkron demo-adapter; bibehåller befintligt UI-beteende. */
export const demoLightController: LightController = {
  mode: "demo",
  updateLight(current, deviceId, change) {
    return { ...current, [deviceId]: mergeLight(current[deviceId], change) };
  },
  updateRoom(current, deviceIds, change) {
    const next = { ...current };
    for (const id of deviceIds) next[id] = mergeLight(current[id], change);
    return next;
  },
  applyScene(current, deviceIds, saved) {
    const next = { ...current };
    for (const id of deviceIds) {
      if (saved[id]) next[id] = mergeLight(undefined, saved[id]);
    }
    return next;
  },
};

/** Status för styrgränssnittet. Demo innebär aldrig en fysisk anslutning. */
export type ControlStatus =
  | { mode: "demo"; state: "ready"; label: "Demoläge" }
  | { mode: "home-assistant"; state: "offline" | "connecting" | "ready"; label: string };

export const DEMO_CONTROL_STATUS: ControlStatus = {
  mode: "demo",
  state: "ready",
  label: "Demoläge",
};

/** Fångar synkrona styrfel utan att påverka tidigare lamptillstånd. */
export type ControlResult =
  | { ok: true; lights: LightStates }
  | { ok: false; lights: LightStates; error: string };

export function tryControl(
  current: LightStates,
  command: () => LightStates,
): ControlResult {
  try {
    return { ok: true, lights: command() };
  } catch (error) {
    return {
      ok: false,
      lights: current,
      error: error instanceof Error ? error.message : "Ett okänt styrfel inträffade.",
    };
  }
}

/** Enbart lokal metadata. Ett sparat entityId innebär INTE att enheten är ansluten. */
export type EntityMappingStatus = "unmapped" | "prepared" | "invalid";

export function validateHomeAssistantEntityId(entityId: string, type: DeviceType): string | null {
  const id = entityId.trim();
  if (!id) return null;
  if (!/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(id)) return "Använd formatet domain.entity_name, exempelvis light.vardagsrum.";
  const requiredDomain: Partial<Record<DeviceType, string>> = { light: "light", sensor: "sensor", speaker: "media_player" };
  if (requiredDomain[type] && !id.startsWith(`${requiredDomain[type]}.`)) {
    return `Den valda enhetstypen kräver ett ID som börjar med ${requiredDomain[type]}.`;
  }
  return null;
}

export function getEntityMappingStatus(device: Pick<SmartDevice, "entityId" | "type">): EntityMappingStatus {
  if (!device.entityId?.trim()) return "unmapped";
  return validateHomeAssistantEntityId(device.entityId, device.type) ? "invalid" : "prepared";
}

export const ENTITY_MAPPING_LABELS: Record<EntityMappingStatus, string> = {
  unmapped: "Saknar HA-ID",
  prepared: "HA-ID förberett",
  invalid: "Kontrollera HA-ID",
};

/** Lokal kontroll av HA-kopplingar. Gör inga nätverksanrop. */
export type MappingIssue = { deviceId: string; deviceName: string; message: string };
export function inspectEntityMappings(devices: SmartDevice[]): MappingIssue[] {
  const issues: MappingIssue[] = [];
  const seen = new Map<string, string>();
  for (const device of devices) {
    const id = (device.entityId ?? "").trim();
    if (!id) {
      issues.push({ deviceId: device.id, deviceName: device.name, message: "Saknar HA-ID" });
      continue;
    }
    const validationError = validateHomeAssistantEntityId(id, device.type);
    if (validationError) issues.push({ deviceId: device.id, deviceName: device.name, message: validationError });
    const key = id.toLowerCase();
    const previous = seen.get(key);
    if (previous) issues.push({ deviceId: device.id, deviceName: device.name, message: `HA-ID används även av ${previous}` });
    else seen.set(key, device.name);
  }
  return issues;
}

/** Exportformat för framtida HA-integration; innehåller inga autentiseringsuppgifter. */
export function createEntityMappingExport(devices: SmartDevice[]) {
  return {
    schemaVersion: 1,
    source: "family-dashboard-hemmet3d",
    mode: "demo" as const,
    devices: devices.map(device => ({
      deviceId: device.id,
      name: device.name,
      type: device.type,
      roomId: device.roomId,
      entityId: (device.entityId ?? "").trim(),
      status: getEntityMappingStatus(device),
    })),
  };
}
