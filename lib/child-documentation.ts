import "server-only";

import { supabase } from "@/lib/supabase";

export type ChildGrowthMeasurement = {
  id: string;
  measurementDate: string;
  weightKg: number | null;
  heightCm: number | null;
  createdAt: string | null;
};

export type ChildTooth = {
  id: string;
  toothCode: string;
  toothName: string;
  eruptionDate: string;
  createdAt: string | null;
};

export type ChildVaccination = {
  id: string;
  vaccineName: string;
  vaccinationDate: string;
  dose: string | null;
  notes: string | null;
  createdAt: string | null;
};

export type ChildDocumentationData = {
  child: {
    id: string;
    displayName: string;
    birthday: string;
    emoji: string;
  };
  growth: ChildGrowthMeasurement[];
  teeth: ChildTooth[];
  vaccinations: ChildVaccination[];
  warnings: string[];
  generatedAt: string;
};

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function isMissingColumnError(
  error: { message?: string; code?: string } | null
): boolean {
  if (!error) {
    return false;
  }

  const message =
    error.message?.toLocaleLowerCase("sv-SE") ?? "";

  return (
    error.code === "42703" ||
    message.includes("member_id") ||
    message.includes("column")
  );
}

export async function getChildDocumentationData(
  memberId: string
): Promise<ChildDocumentationData> {
  const warnings: string[] = [];

  const memberResult =
    await supabase
      .from("family_members")
      .select(
        "id, display_name, birthday, emoji, member_type, is_active"
      )
      .eq("id", memberId)
      .single();

  if (memberResult.error || !memberResult.data) {
    throw new Error(
      "Barnet kunde inte hittas i family_members."
    );
  }

  if (memberResult.data.member_type !== "child") {
    throw new Error(
      "Dokumentation kan bara skapas för familjemedlemmar av typen child."
    );
  }

  const growthResult =
    await supabase
      .from("signe_growth")
      .select(
        "id, member_id, measurement_date, weight_kg, height_cm, created_at"
      )
      .eq("member_id", memberId)
      .order("measurement_date", {
        ascending: true,
      });

  if (growthResult.error) {
    throw new Error(
      `Tillväxtdata kunde inte hämtas: ${growthResult.error.message}`
    );
  }

  const growth: ChildGrowthMeasurement[] =
    (growthResult.data ?? []).map((row) => ({
      id: String(row.id),
      measurementDate: String(row.measurement_date),
      weightKg: numberOrNull(row.weight_kg),
      heightCm: numberOrNull(row.height_cm),
      createdAt:
        typeof row.created_at === "string"
          ? row.created_at
          : null,
    }));

  /*
   * Tänder och vaccinationer migrerades senare från
   * Signe-specifika tabeller. Vi filtrerar alltid på
   * member_id. Om en äldre databasmigration saknar
   * kolumnen utelämnas sektionen hellre än att data
   * från fel barn tas med.
   */
  const teethResult =
    await supabase
      .from("signe_teeth")
      .select(
        "id, member_id, tooth_code, tooth_name, eruption_date, created_at"
      )
      .eq("member_id", memberId)
      .order("eruption_date", {
        ascending: true,
      });

  let teeth: ChildTooth[] = [];

  if (teethResult.error) {
    if (isMissingColumnError(teethResult.error)) {
      warnings.push(
        "Tanddata kunde inte kopplas säkert till barnet eftersom signe_teeth saknar member_id."
      );
    } else {
      warnings.push(
        `Tanddata kunde inte hämtas: ${teethResult.error.message}`
      );
    }
  } else {
    teeth =
      (teethResult.data ?? []).map((row) => ({
        id: String(row.id),
        toothCode: String(row.tooth_code),
        toothName: String(row.tooth_name),
        eruptionDate: String(row.eruption_date),
        createdAt:
          typeof row.created_at === "string"
            ? row.created_at
            : null,
      }));
  }

  const vaccinationsResult =
    await supabase
      .from("signe_vaccinations")
      .select(
        "id, member_id, vaccine_name, vaccination_date, dose, notes, created_at"
      )
      .eq("member_id", memberId)
      .order("vaccination_date", {
        ascending: true,
      });

  let vaccinations: ChildVaccination[] = [];

  if (vaccinationsResult.error) {
    if (isMissingColumnError(vaccinationsResult.error)) {
      warnings.push(
        "Vaccinationsdata kunde inte kopplas säkert till barnet eftersom signe_vaccinations saknar member_id."
      );
    } else {
      warnings.push(
        `Vaccinationsdata kunde inte hämtas: ${vaccinationsResult.error.message}`
      );
    }
  } else {
    vaccinations =
      (vaccinationsResult.data ?? []).map((row) => ({
        id: String(row.id),
        vaccineName: String(row.vaccine_name),
        vaccinationDate: String(row.vaccination_date),
        dose:
          typeof row.dose === "string"
            ? row.dose
            : null,
        notes:
          typeof row.notes === "string"
            ? row.notes
            : null,
        createdAt:
          typeof row.created_at === "string"
            ? row.created_at
            : null,
      }));
  }

  return {
    child: {
      id: String(memberResult.data.id),
      displayName: String(memberResult.data.display_name),
      birthday: String(memberResult.data.birthday),
      emoji:
        typeof memberResult.data.emoji === "string"
          ? memberResult.data.emoji
          : "👶",
    },
    growth,
    teeth,
    vaccinations,
    warnings,
    generatedAt: new Date().toISOString(),
  };
}
