"use client";

import {
  Archive,
  ArchiveRestore,
  Baby,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  UserRound,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import type { AccentColor } from "@/lib/family";

type MemberType = "adult" | "child";

type FamilyMemberRow = {
  id: string;
  display_name: string;
  emoji: string;
  birthday: string;
  accent: AccentColor;
  member_type: MemberType;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type NameDayRow = {
  id: string;
  member_id: string;
  name: string;
  month: number;
  day: number;
  created_at: string;
};

type MemberWithNameDays = FamilyMemberRow & {
  nameDays: NameDayRow[];
};

type MemberFormState = {
  displayName: string;
  emoji: string;
  birthday: string;
  accent: AccentColor;
  memberType: MemberType;
};

type NameDayFormState = {
  name: string;
  month: string;
  day: string;
};

const EMPTY_MEMBER_FORM: MemberFormState = {
  displayName: "",
  emoji: "👤",
  birthday: "",
  accent: "blue",
  memberType: "adult",
};

const EMPTY_NAME_DAY_FORM: NameDayFormState = {
  name: "",
  month: "",
  day: "",
};

function formatBirthday(dateString: string): string {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return dateString;
  }

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatNameDay(
  month: number,
  day: number
): string {
  return new Date(
    2026,
    month - 1,
    day
  ).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
  });
}

function getAccentLabel(
  accent: AccentColor
): string {
  switch (accent) {
    case "rose":
      return "Rosa";
    case "amber":
      return "Gul";
    case "blue":
    default:
      return "Blå";
  }
}

function getMemberTypeLabel(
  memberType: MemberType
): string {
  return memberType === "child"
    ? "Barn"
    : "Vuxen";
}

export default function FamilyManagerWidget() {
  const [members, setMembers] =
    useState<MemberWithNameDays[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [showAddMember, setShowAddMember] =
    useState(false);

  const [editingMemberId, setEditingMemberId] =
    useState<string | null>(null);

  const [memberForm, setMemberForm] =
    useState<MemberFormState>(
      EMPTY_MEMBER_FORM
    );

  const [nameDayMemberId, setNameDayMemberId] =
    useState<string | null>(null);

  const [nameDayForm, setNameDayForm] =
    useState<NameDayFormState>(
      EMPTY_NAME_DAY_FORM
    );

  const [
    showArchivedMembers,
    setShowArchivedMembers,
  ] = useState(false);

  const loadFamily = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const [
      membersResult,
      nameDaysResult,
    ] = await Promise.all([
      supabase
        .from("family_members")
        .select(
          [
            "id",
            "display_name",
            "emoji",
            "birthday",
            "accent",
            "member_type",
            "sort_order",
            "is_active",
            "created_at",
            "updated_at",
          ].join(", ")
        )
        .order("sort_order", {
          ascending: true,
        })
        .order("created_at", {
          ascending: true,
        }),

      supabase
        .from("family_name_days")
        .select(
          "id, member_id, name, month, day, created_at"
        )
        .order("month", {
          ascending: true,
        })
        .order("day", {
          ascending: true,
        }),
    ]);

    if (membersResult.error) {
      console.error(
        "Kunde inte hämta familjemedlemmar:",
        membersResult.error
      );

      setErrorMessage(
        "Kunde inte hämta familjemedlemmarna."
      );

      setIsLoading(false);
      return;
    }

    if (nameDaysResult.error) {
      console.error(
        "Kunde inte hämta namnsdagar:",
        nameDaysResult.error
      );

      setErrorMessage(
        "Kunde inte hämta namnsdagarna."
      );

      setIsLoading(false);
      return;
    }

    const memberRows =
      (membersResult.data ??
        []) as FamilyMemberRow[];

    const nameDayRows =
      (nameDaysResult.data ??
        []) as NameDayRow[];

    setMembers(
      memberRows.map((member) => ({
        ...member,
        nameDays: nameDayRows.filter(
          (nameDay) =>
            nameDay.member_id === member.id
        ),
      }))
    );

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadFamily();
  }, [loadFamily]);

  const activeMembers = useMemo(
    () =>
      members
        .filter(
          (member) => member.is_active
        )
        .sort(
          (first, second) =>
            first.sort_order -
              second.sort_order ||
            first.created_at.localeCompare(
              second.created_at
            )
        ),
    [members]
  );

  const archivedMembers = useMemo(
    () =>
      members
        .filter(
          (member) => !member.is_active
        )
        .sort(
          (first, second) =>
            first.sort_order -
              second.sort_order ||
            first.created_at.localeCompare(
              second.created_at
            )
        ),
    [members]
  );

  function dispatchFamilyChange() {
    window.dispatchEvent(
      new CustomEvent(
        "family-data-changed"
      )
    );
  }

  function resetMemberForm() {
    setMemberForm(
      EMPTY_MEMBER_FORM
    );
    setEditingMemberId(null);
    setShowAddMember(false);
  }

  function startAddMember() {
    setEditingMemberId(null);

    setMemberForm({
      ...EMPTY_MEMBER_FORM,
      memberType: "child",
      emoji: "👶",
    });

    setShowAddMember(true);
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  function startEditMember(
    member: MemberWithNameDays
  ) {
    setShowAddMember(false);
    setEditingMemberId(member.id);

    setMemberForm({
      displayName: member.display_name,
      emoji: member.emoji,
      birthday: member.birthday,
      accent: member.accent,
      memberType: member.member_type,
    });

    setSuccessMessage(null);
    setErrorMessage(null);
  }

  async function handleMemberSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const displayName =
      memberForm.displayName.trim();

    const emoji =
      memberForm.emoji.trim() || "👤";

    if (
      !displayName ||
      !memberForm.birthday ||
      isSaving
    ) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (editingMemberId) {
      const { error } = await supabase
        .from("family_members")
        .update({
          display_name: displayName,
          emoji,
          birthday:
            memberForm.birthday,
          accent:
            memberForm.accent,
          member_type:
            memberForm.memberType,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", editingMemberId);

      if (error) {
        console.error(
          "Kunde inte uppdatera familjemedlem:",
          error
        );

        setErrorMessage(
          "Personen kunde inte uppdateras."
        );

        setIsSaving(false);
        return;
      }

      setSuccessMessage(
        `${displayName} är uppdaterad.`
      );
    } else {
      const highestSortOrder =
        members.reduce(
          (highest, member) =>
            Math.max(
              highest,
              member.sort_order ?? 0
            ),
          0
        );

      const nextSortOrder =
        highestSortOrder + 10;

      const { error } = await supabase
        .from("family_members")
        .insert({
          display_name: displayName,
          emoji,
          birthday:
            memberForm.birthday,
          accent:
            memberForm.accent,
          member_type:
            memberForm.memberType,
          sort_order:
            nextSortOrder,
          is_active: true,
        });

      if (error) {
        console.error(
          "Kunde inte lägga till familjemedlem:",
          error
        );

        setErrorMessage(
          "Personen kunde inte läggas till."
        );

        setIsSaving(false);
        return;
      }

      setSuccessMessage(
        `${displayName} är tillagd.`
      );
    }

    resetMemberForm();
    await loadFamily();
    setIsSaving(false);
    dispatchFamilyChange();
  }

  async function archiveMember(
    member: MemberWithNameDays
  ) {
    if (workingId || isSaving) {
      return;
    }

    const confirmed =
      window.confirm(
        `Arkivera ${member.display_name}? Personen försvinner från den aktiva familjen, men all information sparas.`
      );

    if (!confirmed) {
      return;
    }

    setWorkingId(member.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase
      .from("family_members")
      .update({
        is_active: false,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", member.id);

    if (error) {
      console.error(
        "Kunde inte arkivera familjemedlem:",
        error
      );

      setErrorMessage(
        "Personen kunde inte arkiveras."
      );

      setWorkingId(null);
      return;
    }

    if (
      editingMemberId === member.id
    ) {
      resetMemberForm();
    }

    setSuccessMessage(
      `${member.display_name} är arkiverad.`
    );

    await loadFamily();
    setWorkingId(null);
    dispatchFamilyChange();
  }

  async function restoreMember(
    member: MemberWithNameDays
  ) {
    if (workingId || isSaving) {
      return;
    }

    setWorkingId(member.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase
      .from("family_members")
      .update({
        is_active: true,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", member.id);

    if (error) {
      console.error(
        "Kunde inte återaktivera familjemedlem:",
        error
      );

      setErrorMessage(
        "Personen kunde inte återaktiveras."
      );

      setWorkingId(null);
      return;
    }

    setSuccessMessage(
      `${member.display_name} är aktiv igen.`
    );

    await loadFamily();
    setWorkingId(null);
    dispatchFamilyChange();
  }

  async function moveMember(
    member: MemberWithNameDays,
    direction: "up" | "down"
  ) {
    if (workingId || isSaving) {
      return;
    }

    const currentIndex =
      activeMembers.findIndex(
        (item) =>
          item.id === member.id
      );

    if (currentIndex < 0) {
      return;
    }

    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
        activeMembers.length
    ) {
      return;
    }

    const targetMember =
      activeMembers[targetIndex];

    setWorkingId(member.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const currentSortOrder =
      member.sort_order;

    const targetSortOrder =
      targetMember.sort_order;

    const firstUpdate =
      await supabase
        .from("family_members")
        .update({
          sort_order:
            targetSortOrder,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", member.id);

    if (firstUpdate.error) {
      console.error(
        "Kunde inte ändra personordningen:",
        firstUpdate.error
      );

      setErrorMessage(
        "Ordningen kunde inte ändras."
      );

      setWorkingId(null);
      return;
    }

    const secondUpdate =
      await supabase
        .from("family_members")
        .update({
          sort_order:
            currentSortOrder,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", targetMember.id);

    if (secondUpdate.error) {
      console.error(
        "Kunde inte slutföra personordningen:",
        secondUpdate.error
      );

      await supabase
        .from("family_members")
        .update({
          sort_order:
            currentSortOrder,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", member.id);

      setErrorMessage(
        "Ordningen kunde inte ändras."
      );

      await loadFamily();
      setWorkingId(null);
      return;
    }

    await loadFamily();
    setWorkingId(null);
    dispatchFamilyChange();
  }

  function startAddNameDay(
    memberId: string
  ) {
    setNameDayMemberId(memberId);
    setNameDayForm(
      EMPTY_NAME_DAY_FORM
    );
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function addNameDay(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !nameDayMemberId ||
      isSaving
    ) {
      return;
    }

    const name =
      nameDayForm.name.trim();

    const month =
      Number.parseInt(
        nameDayForm.month,
        10
      );

    const day =
      Number.parseInt(
        nameDayForm.day,
        10
      );

    if (
      !name ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    ) {
      setErrorMessage(
        "Fyll i namn, månad och dag."
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase
      .from("family_name_days")
      .insert({
        member_id:
          nameDayMemberId,
        name,
        month,
        day,
      });

    if (error) {
      console.error(
        "Kunde inte lägga till namnsdag:",
        error
      );

      setErrorMessage(
        "Namnsdagen kunde inte läggas till."
      );

      setIsSaving(false);
      return;
    }

    setNameDayMemberId(null);
    setNameDayForm(
      EMPTY_NAME_DAY_FORM
    );

    setSuccessMessage(
      `${name} har fått en namnsdag.`
    );

    await loadFamily();
    setIsSaving(false);
    dispatchFamilyChange();
  }

  async function deleteNameDay(
    nameDay: NameDayRow
  ) {
    if (workingId || isSaving) {
      return;
    }

    const confirmed =
      window.confirm(
        `Ta bort namnsdagen för ${nameDay.name}?`
      );

    if (!confirmed) {
      return;
    }

    setWorkingId(nameDay.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase
      .from("family_name_days")
      .delete()
      .eq("id", nameDay.id);

    if (error) {
      console.error(
        "Kunde inte ta bort namnsdag:",
        error
      );

      setErrorMessage(
        "Namnsdagen kunde inte tas bort."
      );

      setWorkingId(null);
      return;
    }

    setSuccessMessage(
      "Namnsdagen är borttagen."
    );

    await loadFamily();
    setWorkingId(null);
    dispatchFamilyChange();
  }

  function MemberForm({
    title,
  }: {
    title: string;
  }) {
    return (
      <form
        onSubmit={
          handleMemberSubmit
        }
        className="rounded-2xl border border-blue-300/15 bg-blue-400/[0.05] p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-white">
              {title}
            </p>

            {!editingMemberId && (
              <p className="mt-1 text-xs text-slate-400">
                En ny person läggs sist
                i Familjen.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={
              resetMemberForm
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Stäng formuläret"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Namn
            </span>

            <input
              value={
                memberForm.displayName
              }
              onChange={(event) =>
                setMemberForm(
                  (current) => ({
                    ...current,
                    displayName:
                      event.target.value,
                  })
                )
              }
              maxLength={60}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              placeholder="Till exempel Anna"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Typ
            </span>

            <select
              value={
                memberForm.memberType
              }
              onChange={(event) => {
                const memberType =
                  event.target
                    .value as MemberType;

                setMemberForm(
                  (current) => ({
                    ...current,
                    memberType,
                    emoji:
                      current.emoji ===
                        "👤" ||
                      current.emoji ===
                        "👶"
                        ? memberType ===
                          "child"
                          ? "👶"
                          : "👤"
                        : current.emoji,
                  })
                );
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            >
              <option value="adult">
                Vuxen
              </option>

              <option value="child">
                Barn
              </option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Emoji
            </span>

            <input
              value={
                memberForm.emoji
              }
              onChange={(event) =>
                setMemberForm(
                  (current) => ({
                    ...current,
                    emoji:
                      event.target.value,
                  })
                )
              }
              maxLength={8}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              placeholder="👤"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Födelsedag
            </span>

            <input
              type="date"
              value={
                memberForm.birthday
              }
              onChange={(event) =>
                setMemberForm(
                  (current) => ({
                    ...current,
                    birthday:
                      event.target.value,
                  })
                )
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Färg
            </span>

            <select
              value={
                memberForm.accent
              }
              onChange={(event) =>
                setMemberForm(
                  (current) => ({
                    ...current,
                    accent:
                      event.target
                        .value as AccentColor,
                  })
                )
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            >
              <option value="blue">
                Blå
              </option>

              <option value="rose">
                Rosa
              </option>

              <option value="amber">
                Gul
              </option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={
            isSaving ||
            !memberForm.displayName.trim() ||
            !memberForm.birthday
          }
          className="mt-4 flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? (
            <LoaderCircle
              size={17}
              className="animate-spin"
            />
          ) : (
            <Save size={17} />
          )}

          {editingMemberId
            ? "Spara ändringar"
            : "Lägg till person"}
        </button>
      </form>
    );
  }

  function MemberCard({
    member,
    index,
  }: {
    member: MemberWithNameDays;
    index: number;
  }) {
    const isWorking =
      workingId === member.id;

    const TypeIcon =
      member.member_type ===
      "child"
        ? Baby
        : UserRound;

    return (
      <div key={member.id}>
        {editingMemberId ===
        member.id ? (
          <MemberForm
            title={`Redigera ${member.display_name}`}
          />
        ) : (
          <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-3xl">
                  {member.emoji}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl font-bold text-white">
                      {
                        member.display_name
                      }
                    </p>

                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-300/15 bg-blue-400/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-blue-200">
                      <TypeIcon
                        size={12}
                      />

                      {getMemberTypeLabel(
                        member.member_type
                      )}
                    </span>

                    <span className="rounded-full border border-emerald-300/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-300">
                      Aktiv
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays
                        size={15}
                      />

                      {formatBirthday(
                        member.birthday
                      )}
                    </span>

                    <span>
                      Färg:{" "}
                      {getAccentLabel(
                        member.accent
                      )}
                    </span>

                    <span>
                      Ordning:{" "}
                      {index + 1}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="flex overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  <button
                    type="button"
                    disabled={
                      workingId !==
                        null ||
                      index === 0
                    }
                    onClick={() =>
                      void moveMember(
                        member,
                        "up"
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-25"
                    aria-label={`Flytta ${member.display_name} upp`}
                  >
                    <ChevronUp
                      size={17}
                    />
                  </button>

                  <button
                    type="button"
                    disabled={
                      workingId !==
                        null ||
                      index ===
                        activeMembers.length -
                          1
                    }
                    onClick={() =>
                      void moveMember(
                        member,
                        "down"
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center border-l border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-25"
                    aria-label={`Flytta ${member.display_name} ner`}
                  >
                    <ChevronDown
                      size={17}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    startEditMember(
                      member
                    )
                  }
                  disabled={
                    workingId !== null
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                  aria-label={`Redigera ${member.display_name}`}
                >
                  <Pencil
                    size={17}
                  />
                </button>

                <button
                  type="button"
                  disabled={
                    workingId !== null
                  }
                  onClick={() =>
                    void archiveMember(
                      member
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/[0.06] text-amber-300 transition hover:bg-amber-400/15 disabled:opacity-40"
                  aria-label={`Arkivera ${member.display_name}`}
                >
                  {isWorking ? (
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Archive
                      size={17}
                    />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">
                  Namnsdagar
                </p>

                {nameDayMemberId !==
                  member.id && (
                  <button
                    type="button"
                    onClick={() =>
                      startAddNameDay(
                        member.id
                      )
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <Plus size={14} />
                    Lägg till
                  </button>
                )}
              </div>

              {member.nameDays.length >
              0 ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {member.nameDays.map(
                    (nameDay) => (
                      <div
                        key={
                          nameDay.id
                        }
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {
                              nameDay.name
                            }
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatNameDay(
                              nameDay.month,
                              nameDay.day
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={
                            workingId !==
                              null ||
                            isSaving
                          }
                          onClick={() =>
                            void deleteNameDay(
                              nameDay
                            )
                          }
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-40"
                          aria-label={`Ta bort namnsdag ${nameDay.name}`}
                        >
                          {workingId ===
                          nameDay.id ? (
                            <LoaderCircle
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <X size={15} />
                          )}
                        </button>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Inga namnsdagar
                  registrerade.
                </p>
              )}

              {nameDayMemberId ===
                member.id && (
                <form
                  onSubmit={
                    addNameDay
                  }
                  className="mt-4 rounded-xl border border-amber-300/15 bg-amber-400/[0.05] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">
                      Ny namnsdag
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setNameDayMemberId(
                          null
                        )
                      }
                      className="text-slate-400 transition hover:text-white"
                      aria-label="Stäng"
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_110px_110px_auto] sm:items-end">
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-slate-400">
                        Namn
                      </span>

                      <input
                        value={
                          nameDayForm.name
                        }
                        onChange={(
                          event
                        ) =>
                          setNameDayForm(
                            (current) => ({
                              ...current,
                              name:
                                event.target
                                  .value,
                            })
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-white outline-none focus:border-amber-300/40"
                        placeholder="Namn"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs text-slate-400">
                        Månad
                      </span>

                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={
                          nameDayForm.month
                        }
                        onChange={(
                          event
                        ) =>
                          setNameDayForm(
                            (current) => ({
                              ...current,
                              month:
                                event.target
                                  .value,
                            })
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-white outline-none focus:border-amber-300/40"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs text-slate-400">
                        Dag
                      </span>

                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={
                          nameDayForm.day
                        }
                        onChange={(
                          event
                        ) =>
                          setNameDayForm(
                            (current) => ({
                              ...current,
                              day:
                                event.target
                                  .value,
                            })
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-white outline-none focus:border-amber-300/40"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={
                        isSaving
                      }
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-40"
                    >
                      {isSaving ? (
                        <LoaderCircle
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Plus
                          size={16}
                        />
                      )}

                      Spara
                    </button>
                  </div>
                </form>
              )}
            </div>
          </article>
        )}
      </div>
    );
  }

  return (
    <Card
      title="Hantera familj"
      icon={<Users size={28} />}
      storageKey="family-manager"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-white">
            Familjemedlemmar
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Hantera personer,
            födelsedagar, namnsdagar
            och vilka som tillhör den
            aktiva familjen.
          </p>
        </div>

        {!showAddMember &&
          !editingMemberId && (
            <button
              type="button"
              onClick={startAddMember}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              <UserPlus size={17} />
              Lägg till person
            </button>
          )}
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          {successMessage}
        </div>
      )}

      {showAddMember && (
        <div className="mb-5">
          <MemberForm title="Ny familjemedlem" />
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03]">
          <LoaderCircle
            size={30}
            className="animate-spin text-blue-300"
          />

          <p className="text-sm text-slate-400">
            Hämtar familjen…
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-300/15 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-semibold text-emerald-300">
              {activeMembers.length}{" "}
              {activeMembers.length === 1
                ? "aktiv person"
                : "aktiva personer"}
            </span>

            {archivedMembers.length >
              0 && (
              <span className="rounded-full border border-slate-300/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-400">
                {archivedMembers.length}{" "}
                arkiverade
              </span>
            )}
          </div>

          {activeMembers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <Users
                size={34}
                className="mx-auto text-blue-300"
              />

              <p className="mt-3 font-semibold text-white">
                Inga aktiva
                familjemedlemmar
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Lägg till en person
                eller återaktivera en
                arkiverad person.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeMembers.map(
                (member, index) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    index={index}
                  />
                )
              )}
            </div>
          )}

          {archivedMembers.length >
            0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
              <button
                type="button"
                onClick={() =>
                  setShowArchivedMembers(
                    (current) =>
                      !current
                  )
                }
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-white/[0.04]"
                aria-expanded={
                  showArchivedMembers
                }
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400">
                    <Archive
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="font-semibold text-white">
                      Arkiverade
                      familjemedlemmar
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {
                        archivedMembers.length
                      }{" "}
                      arkiverade
                    </p>
                  </div>
                </div>

                {showArchivedMembers ? (
                  <ChevronUp
                    size={19}
                    className="text-slate-400"
                  />
                ) : (
                  <ChevronDown
                    size={19}
                    className="text-slate-400"
                  />
                )}
              </button>

              {showArchivedMembers && (
                <div className="grid gap-3 border-t border-white/10 p-4">
                  {archivedMembers.map(
                    (member) => (
                      <article
                        key={
                          member.id
                        }
                        className="flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-950/20 p-4 opacity-80 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-2xl">
                            {
                              member.emoji
                            }
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">
                                {
                                  member.display_name
                                }
                              </p>

                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                {getMemberTypeLabel(
                                  member.member_type
                                )}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatBirthday(
                                member.birthday
                              )}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={
                            workingId !==
                            null
                          }
                          onClick={() =>
                            void restoreMember(
                              member
                            )
                          }
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.07] px-4 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/15 disabled:opacity-40"
                        >
                          {workingId ===
                          member.id ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <ArchiveRestore
                              size={16}
                            />
                          )}

                          Återaktivera
                        </button>
                      </article>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <RefreshCw
          size={17}
          className="mt-0.5 shrink-0 text-blue-300"
        />

        <p className="text-xs leading-5 text-slate-500">
          Ändringar sparas direkt i
          familjens Supabase-databas.
          Arkivering behåller personens
          data. I nästa etapp använder
          Familjen-fliken de aktiva
          personerna automatiskt.
        </p>
      </div>
    </Card>
  );
}