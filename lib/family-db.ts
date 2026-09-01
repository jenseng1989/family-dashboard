import { supabase } from "@/lib/supabase";
import type {
  AccentColor,
  FamilyMember,
  FamilyName,
  MemberType,
} from "@/lib/family";

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

function isAccentColor(
  value: string
): value is AccentColor {
  return (
    value === "blue" ||
    value === "rose" ||
    value === "amber" ||
    value === "green" ||
    value === "purple" ||
    value === "cyan" ||
    value === "orange" ||
    value === "red" ||
    value === "indigo" ||
    value === "lime"
  );
}

function normalizeAccent(
  value: string
): AccentColor {
  return isAccentColor(value)
    ? value
    : "blue";
}

function normalizeMemberType(
  value: string
): MemberType {
  return value === "child"
    ? "child"
    : "adult";
}

export async function getFamilyMembersFromDatabase(): Promise<
  FamilyMember[]
> {
  const [
    membersResult,
    nameDaysResult,
  ] = await Promise.all([
    supabase
      .from("family_members")
      .select(
        "id, display_name, emoji, birthday, accent, member_type, sort_order, is_active, created_at, updated_at"
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      ),

    supabase
      .from("family_name_days")
      .select(
        "id, member_id, name, month, day, created_at"
      )
      .order(
        "month",
        {
          ascending: true,
        }
      )
      .order(
        "day",
        {
          ascending: true,
        }
      ),
  ]);

  if (membersResult.error) {
    console.error(
      "Kunde inte hämta familjemedlemmar:",
      membersResult.error
    );

    throw new Error(
      "Kunde inte hämta familjemedlemmarna från databasen."
    );
  }

  if (nameDaysResult.error) {
    console.error(
      "Kunde inte hämta namnsdagar:",
      nameDaysResult.error
    );

    throw new Error(
      "Kunde inte hämta namnsdagarna från databasen."
    );
  }

  const memberRows =
    (
      membersResult.data ??
      []
    ) as unknown as FamilyMemberRow[];

  const nameDayRows =
    (
      nameDaysResult.data ??
      []
    ) as unknown as FamilyNameDayRow[];

  const nameDaysByMember =
    new Map<
      string,
      FamilyName[]
    >();

  nameDayRows.forEach(
    (row) => {
      const currentNames =
        nameDaysByMember.get(
          row.member_id
        ) ?? [];

      currentNames.push({
        name: row.name,
        nameDay: {
          month: row.month,
          day: row.day,
        },
      });

      nameDaysByMember.set(
        row.member_id,
        currentNames
      );
    }
  );

  return memberRows.map(
    (row) => ({
      id: row.id,
      displayName:
        row.display_name,
      emoji: row.emoji,
      birthday:
        row.birthday,
      accent:
        normalizeAccent(
          row.accent
        ),
      names:
        nameDaysByMember.get(
          row.id
        ) ?? [],
      memberType:
        normalizeMemberType(
          row.member_type
        ),
      sortOrder:
        row.sort_order,
      isActive:
        row.is_active,
    })
  );
}

export async function createFamilyMemberInDatabase(
  input: CreateFamilyMemberInput
): Promise<string> {
  const membersResult =
    await supabase
      .from("family_members")
      .select("sort_order")
      .order(
        "sort_order",
        {
          ascending: false,
        }
      )
      .limit(1);

  if (membersResult.error) {
    console.error(
      "Kunde inte läsa sorteringsordningen:",
      membersResult.error
    );

    throw new Error(
      "Kunde inte bestämma personens placering."
    );
  }

  const highestSortOrder =
    membersResult.data?.[0]
      ?.sort_order ?? 0;

  const nextSortOrder =
    highestSortOrder + 10;

  const insertResult =
    await supabase
      .from("family_members")
      .insert({
        display_name:
          input.displayName.trim(),
        emoji:
          input.emoji.trim() ||
          (input.memberType ===
          "child"
            ? "👶"
            : "👤"),
        birthday:
          input.birthday,
        accent:
          input.accent,
        member_type:
          input.memberType,
        sort_order:
          nextSortOrder,
        is_active: true,
      })
      .select("id")
      .single();

  if (insertResult.error) {
    console.error(
      "Kunde inte skapa familjemedlem:",
      insertResult.error
    );

    throw new Error(
      "Kunde inte lägga till familjemedlemmen."
    );
  }

  return insertResult.data.id;
}

export async function updateFamilyMemberInDatabase(
  member: FamilyMember
): Promise<void> {
  const memberResult =
    await supabase
      .from("family_members")
      .update({
        display_name:
          member.displayName.trim(),
        emoji:
          member.emoji.trim(),
        birthday:
          member.birthday,
        accent:
          member.accent,
        member_type:
          member.memberType,
        sort_order:
          member.sortOrder,
        is_active:
          member.isActive,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        member.id
      );

  if (memberResult.error) {
    console.error(
      "Kunde inte uppdatera familjemedlem:",
      memberResult.error
    );

    throw new Error(
      "Kunde inte spara familjemedlemmen."
    );
  }

  const deleteResult =
    await supabase
      .from("family_name_days")
      .delete()
      .eq(
        "member_id",
        member.id
      );

  if (deleteResult.error) {
    console.error(
      "Kunde inte ersätta namnsdagar:",
      deleteResult.error
    );

    throw new Error(
      "Personuppgifterna sparades, men namnsdagarna kunde inte uppdateras."
    );
  }

  const nameDayRows =
    member.names
      .filter(
        (item) =>
          item.name.trim() &&
          item.nameDay
      )
      .map(
        (item) => ({
          member_id:
            member.id,
          name:
            item.name.trim(),
          month:
            item.nameDay!
              .month,
          day:
            item.nameDay!
              .day,
        })
      );

  if (
    nameDayRows.length > 0
  ) {
    const insertResult =
      await supabase
        .from(
          "family_name_days"
        )
        .insert(
          nameDayRows
        );

    if (
      insertResult.error
    ) {
      console.error(
        "Kunde inte spara namnsdagar:",
        insertResult.error
      );

      throw new Error(
        "Personuppgifterna sparades, men namnsdagarna kunde inte sparas."
      );
    }
  }
}

export async function setFamilyMemberActiveInDatabase(
  memberId: string,
  isActive: boolean
): Promise<void> {
  const result =
    await supabase
      .from("family_members")
      .update({
        is_active:
          isActive,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        memberId
      );

  if (result.error) {
    console.error(
      "Kunde inte ändra familjemedlemmens status:",
      result.error
    );

    throw new Error(
      isActive
        ? "Personen kunde inte återaktiveras."
        : "Personen kunde inte arkiveras."
    );
  }
}

export async function deleteFamilyMemberFromDatabase(
  memberId: string
): Promise<void> {
  const result =
    await supabase
      .from("family_members")
      .delete()
      .eq(
        "id",
        memberId
      )
      .eq(
        "is_active",
        false
      )
      .select("id");

  if (result.error) {
    console.error(
      "Kunde inte radera familjemedlem:",
      result.error
    );

    throw new Error(
      "Personen kunde inte tas bort permanent."
    );
  }

  if (
    !result.data ||
    result.data.length === 0
  ) {
    throw new Error(
      "Personen kunde inte tas bort. Endast arkiverade personer får raderas permanent."
    );
  }
}

export async function moveFamilyMemberInDatabase(
  member: FamilyMember,
  target: FamilyMember
): Promise<void> {
  const memberOrder =
    member.sortOrder;

  const targetOrder =
    target.sortOrder;

  const firstResult =
    await supabase
      .from("family_members")
      .update({
        sort_order:
          targetOrder,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        member.id
      );

  if (firstResult.error) {
    console.error(
      "Kunde inte flytta familjemedlem:",
      firstResult.error
    );

    throw new Error(
      "Ordningen kunde inte ändras."
    );
  }

  const secondResult =
    await supabase
      .from("family_members")
      .update({
        sort_order:
          memberOrder,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        target.id
      );

  if (secondResult.error) {
    console.error(
      "Kunde inte flytta den andra familjemedlemmen:",
      secondResult.error
    );

    await supabase
      .from("family_members")
      .update({
        sort_order:
          memberOrder,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        member.id
      );

    throw new Error(
      "Ordningen kunde inte ändras."
    );
  }
}