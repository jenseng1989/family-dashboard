"use client";

import {
  CalendarDays,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
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
import type {
  AccentColor,
} from "@/lib/family";

type FamilyMemberRow = {
  id: string;
  display_name: string;
  emoji: string;
  birthday: string;
  accent: AccentColor;
  created_at: string;
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
};

const EMPTY_NAME_DAY_FORM: NameDayFormState = {
  name: "",
  month: "",
  day: "",
};

function formatBirthday(
  dateString: string
): string {
  const [year, month, day] =
    dateString
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return dateString;
  }

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatNameDay(
  month: number,
  day: number
): string {
  return new Date(
    2026,
    month - 1,
    day
  ).toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "long",
    }
  );
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

export default function FamilyManagerWidget() {
  const [
    members,
    setMembers,
  ] =
    useState<
      MemberWithNameDays[]
    >([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    showAddMember,
    setShowAddMember,
  ] =
    useState(false);

  const [
    editingMemberId,
    setEditingMemberId,
  ] =
    useState<
      string | null
    >(null);

  const [
    memberForm,
    setMemberForm,
  ] =
    useState<MemberFormState>(
      EMPTY_MEMBER_FORM
    );

  const [
    nameDayMemberId,
    setNameDayMemberId,
  ] =
    useState<
      string | null
    >(null);

  const [
    nameDayForm,
    setNameDayForm,
  ] =
    useState<NameDayFormState>(
      EMPTY_NAME_DAY_FORM
    );

  const loadFamily =
    useCallback(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const [
        membersResult,
        nameDaysResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "family_members"
            )
            .select(
              "id, display_name, emoji, birthday, accent, created_at"
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
              }
            ),

          supabase
            .from(
              "family_name_days"
            )
            .select(
              "id, member_id, name, month, day, created_at"
            )
            .order(
              "month",
              {
                ascending:
                  true,
              }
            )
            .order(
              "day",
              {
                ascending:
                  true,
              }
            ),
        ]);

      if (
        membersResult.error
      ) {
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

      if (
        nameDaysResult.error
      ) {
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
        (
          membersResult.data ??
          []
        ) as FamilyMemberRow[];

      const nameDayRows =
        (
          nameDaysResult.data ??
          []
        ) as NameDayRow[];

      setMembers(
        memberRows.map(
          (member) => ({
            ...member,
            nameDays:
              nameDayRows.filter(
                (nameDay) =>
                  nameDay.member_id ===
                  member.id
              ),
          })
        )
      );

      setIsLoading(false);
    }, []);

  useEffect(() => {
    void loadFamily();
  }, [loadFamily]);

  const sortedMembers =
    useMemo(
      () =>
        [...members].sort(
          (
            first,
            second
          ) =>
            first.created_at.localeCompare(
              second.created_at
            )
        ),
      [members]
    );

  function resetMemberForm() {
    setMemberForm(
      EMPTY_MEMBER_FORM
    );
    setEditingMemberId(
      null
    );
    setShowAddMember(
      false
    );
  }

  function startAddMember() {
    setEditingMemberId(
      null
    );
    setMemberForm(
      EMPTY_MEMBER_FORM
    );
    setShowAddMember(
      true
    );
    setSuccessMessage(
      null
    );
    setErrorMessage(
      null
    );
  }

  function startEditMember(
    member: MemberWithNameDays
  ) {
    setShowAddMember(
      false
    );
    setEditingMemberId(
      member.id
    );
    setMemberForm({
      displayName:
        member.display_name,
      emoji:
        member.emoji,
      birthday:
        member.birthday,
      accent:
        member.accent,
    });
    setSuccessMessage(
      null
    );
    setErrorMessage(
      null
    );
  }

  async function handleMemberSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const displayName =
      memberForm.displayName.trim();

    const emoji =
      memberForm.emoji.trim() ||
      "👤";

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
      const {
        error,
      } =
        await supabase
          .from(
            "family_members"
          )
          .update({
            display_name:
              displayName,
            emoji,
            birthday:
              memberForm.birthday,
            accent:
              memberForm.accent,
          })
          .eq(
            "id",
            editingMemberId
          );

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
      const {
        error,
      } =
        await supabase
          .from(
            "family_members"
          )
          .insert({
            display_name:
              displayName,
            emoji,
            birthday:
              memberForm.birthday,
            accent:
              memberForm.accent,
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

    window.dispatchEvent(
      new CustomEvent(
        "family-data-changed"
      )
    );
  }

  async function deleteMember(
    member: MemberWithNameDays
  ) {
    if (
      deletingId ||
      isSaving
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Ta bort ${member.display_name}? Alla namnsdagar för personen tas också bort.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      member.id
    );
    setErrorMessage(null);
    setSuccessMessage(null);

    const {
      error,
    } =
      await supabase
        .from(
          "family_members"
        )
        .delete()
        .eq(
          "id",
          member.id
        );

    if (error) {
      console.error(
        "Kunde inte ta bort familjemedlem:",
        error
      );

      setErrorMessage(
        "Personen kunde inte tas bort."
      );

      setDeletingId(
        null
      );
      return;
    }

    setSuccessMessage(
      `${member.display_name} är borttagen.`
    );

    await loadFamily();
    setDeletingId(
      null
    );

    window.dispatchEvent(
      new CustomEvent(
        "family-data-changed"
      )
    );
  }

  function startAddNameDay(
    memberId: string
  ) {
    setNameDayMemberId(
      memberId
    );
    setNameDayForm(
      EMPTY_NAME_DAY_FORM
    );
    setErrorMessage(
      null
    );
    setSuccessMessage(
      null
    );
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
      !Number.isInteger(
        month
      ) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(
        day
      ) ||
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

    const {
      error,
    } =
      await supabase
        .from(
          "family_name_days"
        )
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

    setNameDayMemberId(
      null
    );
    setNameDayForm(
      EMPTY_NAME_DAY_FORM
    );
    setSuccessMessage(
      `${name} har fått en namnsdag.`
    );

    await loadFamily();
    setIsSaving(false);

    window.dispatchEvent(
      new CustomEvent(
        "family-data-changed"
      )
    );
  }

  async function deleteNameDay(
    nameDay: NameDayRow
  ) {
    if (
      deletingId ||
      isSaving
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Ta bort namnsdagen för ${nameDay.name}?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      nameDay.id
    );
    setErrorMessage(null);
    setSuccessMessage(null);

    const {
      error,
    } =
      await supabase
        .from(
          "family_name_days"
        )
        .delete()
        .eq(
          "id",
          nameDay.id
        );

    if (error) {
      console.error(
        "Kunde inte ta bort namnsdag:",
        error
      );

      setErrorMessage(
        "Namnsdagen kunde inte tas bort."
      );

      setDeletingId(
        null
      );
      return;
    }

    setSuccessMessage(
      "Namnsdagen är borttagen."
    );

    await loadFamily();
    setDeletingId(
      null
    );

    window.dispatchEvent(
      new CustomEvent(
        "family-data-changed"
      )
    );
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
          <p className="font-semibold text-white">
            {title}
          </p>

          <button
            type="button"
            onClick={
              resetMemberForm
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Stäng formuläret"
          >
            <X
              size={17}
            />
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
              onChange={(
                event
              ) =>
                setMemberForm(
                  (
                    current
                  ) => ({
                    ...current,
                    displayName:
                      event
                        .target
                        .value,
                  })
                )
              }
              maxLength={
                60
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              placeholder="Till exempel Anna"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Emoji
            </span>

            <input
              value={
                memberForm.emoji
              }
              onChange={(
                event
              ) =>
                setMemberForm(
                  (
                    current
                  ) => ({
                    ...current,
                    emoji:
                      event
                        .target
                        .value,
                  })
                )
              }
              maxLength={
                8
              }
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
              onChange={(
                event
              ) =>
                setMemberForm(
                  (
                    current
                  ) => ({
                    ...current,
                    birthday:
                      event
                        .target
                        .value,
                  })
                )
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Färg
            </span>

            <select
              value={
                memberForm.accent
              }
              onChange={(
                event
              ) =>
                setMemberForm(
                  (
                    current
                  ) => ({
                    ...current,
                    accent:
                      event
                        .target
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
            <Save
              size={17}
            />
          )}

          {editingMemberId
            ? "Spara ändringar"
            : "Lägg till person"}
        </button>
      </form>
    );
  }

  return (
    <Card
      title="Hantera familj"
      icon={
        <Users
          size={28}
        />
      }
      storageKey="family-manager"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-white">
            Familjemedlemmar
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Lägg till och redigera personer, födelsedagar och namnsdagar.
          </p>
        </div>

        {!showAddMember &&
          !editingMemberId && (
          <button
            type="button"
            onClick={
              startAddMember
            }
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            <UserPlus
              size={17}
            />

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
          <MemberForm
            title="Ny familjemedlem"
          />
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
      ) : sortedMembers.length ===
        0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
          <Users
            size={34}
            className="mx-auto text-blue-300"
          />

          <p className="mt-3 font-semibold text-white">
            Familjen är tom
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Lägg till den första personen.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedMembers.map(
            (member) => (
              <div
                key={
                  member.id
                }
              >
                {editingMemberId ===
                member.id ? (
                  <MemberForm
                    title={`Redigera ${member.display_name}`}
                  />
                ) : (
                  <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="text-4xl">
                          {
                            member.emoji
                          }
                        </div>

                        <div>
                          <p className="text-xl font-bold text-white">
                            {
                              member.display_name
                            }
                          </p>

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
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            startEditMember(
                              member
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                          aria-label={`Redigera ${member.display_name}`}
                        >
                          <Pencil
                            size={17}
                          />
                        </button>

                        <button
                          type="button"
                          disabled={
                            deletingId !==
                            null
                          }
                          onClick={() =>
                            void deleteMember(
                              member
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/15 bg-red-400/[0.06] text-red-300 transition hover:bg-red-400/15 disabled:opacity-40"
                          aria-label={`Ta bort ${member.display_name}`}
                        >
                          {deletingId ===
                          member.id ? (
                            <LoaderCircle
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2
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
                            <Plus
                              size={14}
                            />

                            Lägg till
                          </button>
                        )}
                      </div>

                      {member.nameDays.length >
                      0 ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {member.nameDays.map(
                            (
                              nameDay
                            ) => (
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
                                    deletingId !==
                                    null
                                  }
                                  onClick={() =>
                                    void deleteNameDay(
                                      nameDay
                                    )
                                  }
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-40"
                                  aria-label={`Ta bort namnsdag ${nameDay.name}`}
                                >
                                  {deletingId ===
                                  nameDay.id ? (
                                    <LoaderCircle
                                      size={15}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2
                                      size={15}
                                    />
                                  )}
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">
                          Inga namnsdagar registrerade.
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
                              <X
                                size={17}
                              />
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
                                    (
                                      current
                                    ) => ({
                                      ...current,
                                      name:
                                        event
                                          .target
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
                                    (
                                      current
                                    ) => ({
                                      ...current,
                                      month:
                                        event
                                          .target
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
                                    (
                                      current
                                    ) => ({
                                      ...current,
                                      day:
                                        event
                                          .target
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
            )
          )}
        </div>
      )}

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <RefreshCw
          size={17}
          className="mt-0.5 shrink-0 text-blue-300"
        />

        <p className="text-xs leading-5 text-slate-500">
          Ändringar sparas direkt i familjens Supabase-databas. Family Timeline kan uppdateras automatiskt när familjedata ändras.
        </p>
      </div>
    </Card>
  );
}
