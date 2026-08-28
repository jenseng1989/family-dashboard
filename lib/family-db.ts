import { supabase } from "@/lib/supabase";
import type {
  AccentColor,
  FamilyMember,
  FamilyName,
} from "@/lib/family";

type FamilyMemberRow = {
  id: string;
  display_name: string;
  emoji: string;
  birthday: string;
  accent: string;
  created_at: string;
};

type FamilyNameDayRow = {
  id: string;
  member_id: string;
  name: string;
  month: number;
  day: number;
  created_at: string;
};

function isAccentColor(
  value: string
): value is AccentColor {
  return (
    value === "blue" ||
    value === "rose" ||
    value === "amber"
  );
}

function normalizeAccent(
  value: string
): AccentColor {
  return isAccentColor(value)
    ? value
    : "blue";
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
        "id, display_name, emoji, birthday, accent, created_at"
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
      membersResult.data ?? []
    ) as FamilyMemberRow[];

  const nameDayRows =
    (
      nameDaysResult.data ?? []
    ) as FamilyNameDayRow[];

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
      emoji:
        row.emoji,
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
    })
  );
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
            item.nameDay!.month,
          day:
            item.nameDay!.day,
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

    if (insertResult.error) {
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
