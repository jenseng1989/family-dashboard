import { supabase } from "@/lib/supabase";
import type { AccentColor, FamilyMember, FamilyName, MemberType } from "@/lib/family";

type FamilyMemberRow = {
  id: string;
  display_name: string;
  emoji: string;
  birthday: string;
  accent: string;
  member_type: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type FamilyNameDayRow = {
  id: string;
  member_id: string;
  name: string;
  month: number;
  day: number;
  created_at: string;
};

export type CreateFamilyMemberInput = {
  displayName: string;
  emoji: string;
  birthday: string;
  accent: AccentColor;
  memberType: MemberType;
};

const FAMILY_CACHE_TTL_MS = 5 * 60 * 1000;
let familyCache: FamilyMember[] | null = null;
let familyCacheAt = 0;
let familyInFlight: Promise<FamilyMember[]> | null = null;

function isAccentColor(value: string): value is AccentColor {
  return ["blue", "rose", "amber", "green", "purple", "cyan", "orange", "red", "indigo", "lime"].includes(value);
}

function normalizeAccent(value: string): AccentColor {
  return isAccentColor(value) ? value : "blue";
}

function normalizeMemberType(value: string): MemberType {
  return value === "child" ? "child" : "adult";
}

function cloneFamilyMembers(members: FamilyMember[]): FamilyMember[] {
  return members.map((member) => ({
    ...member,
    names: member.names.map((item) => ({
      ...item,
      nameDay: item.nameDay ? { ...item.nameDay } : undefined,
    })),
  }));
}

function isFamilyCacheFresh() {
  return familyCache !== null && Date.now() - familyCacheAt < FAMILY_CACHE_TTL_MS;
}

export function clearFamilyMembersCache() {
  familyCache = null;
  familyCacheAt = 0;
  familyInFlight = null;
}

/**
 * Läser familjeuppgifter via ett autentiserat Next.js-API i stället för att
 * fråga Supabase direkt från webbläsaren. Ingen publik nyckel används här.
 */
async function fetchFamilyMembersFromDatabase(): Promise<FamilyMember[]> {
  const response = await fetch("/api/family/members", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Du måste vara inloggad för att läsa familjeuppgifterna."
        : "Kunde inte hämta familjemedlemmarna från servern."
    );
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") {
    throw new Error("Servern returnerade ogiltiga familjeuppgifter.");
  }

  const result = payload as { members?: unknown; nameDays?: unknown };
  if (!Array.isArray(result.members) || !Array.isArray(result.nameDays)) {
    throw new Error("Servern returnerade ofullständiga familjeuppgifter.");
  }

  const memberRows = result.members as FamilyMemberRow[];
  const nameDayRows = result.nameDays as FamilyNameDayRow[];
  const nameDaysByMember = new Map<string, FamilyName[]>();

  nameDayRows.forEach((row) => {
    const currentNames = nameDaysByMember.get(row.member_id) ?? [];
    currentNames.push({
      name: row.name,
      nameDay: { month: row.month, day: row.day },
    });
    nameDaysByMember.set(row.member_id, currentNames);
  });

  return memberRows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    emoji: row.emoji,
    birthday: row.birthday,
    accent: normalizeAccent(row.accent),
    names: nameDaysByMember.get(row.id) ?? [],
    memberType: normalizeMemberType(row.member_type),
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));
}

export async function getFamilyMembersFromDatabase(forceRefresh = false): Promise<FamilyMember[]> {
  if (!forceRefresh && isFamilyCacheFresh() && familyCache) {
    return cloneFamilyMembers(familyCache);
  }
  if (!forceRefresh && familyInFlight) {
    return cloneFamilyMembers(await familyInFlight);
  }

  familyInFlight = fetchFamilyMembersFromDatabase();
  try {
    const members = await familyInFlight;
    familyCache = cloneFamilyMembers(members);
    familyCacheAt = Date.now();
    return cloneFamilyMembers(members);
  } finally {
    familyInFlight = null;
  }
}

// Alla skrivningar går genom det inloggningsskyddade API:et.
async function mutate(action: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch("/api/family/members", {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
      ? result.error : "Kunde inte spara familjeuppgifterna.";
    throw new Error(message);
  }
  clearFamilyMembersCache();
  return result && typeof result === "object" ? result as Record<string, unknown> : {};
}

export async function createFamilyMemberInDatabase(input: CreateFamilyMemberInput): Promise<string> {
  const result = await mutate("create", { input });
  if (typeof result.id !== "string") throw new Error("Servern returnerade inget ID.");
  return result.id;
}
export async function updateFamilyMemberInDatabase(member: FamilyMember): Promise<void> {
  await mutate("update", { member });
}
export async function setFamilyMemberActiveInDatabase(memberId: string, isActive: boolean): Promise<void> {
  await mutate("setActive", { memberId, isActive });
}
export async function deleteFamilyMemberFromDatabase(memberId: string): Promise<void> {
  await mutate("delete", { memberId });
}
export async function moveFamilyMemberInDatabase(member: FamilyMember, target: FamilyMember): Promise<void> {
  await mutate("move", { memberId: member.id, targetId: target.id });
}
