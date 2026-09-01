"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Baby,
  Cake,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Tag,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createFamilyMemberInDatabase,
  deleteFamilyMemberFromDatabase,
  getFamilyMembersFromDatabase,
  moveFamilyMemberInDatabase,
  setFamilyMemberActiveInDatabase,
  updateFamilyMemberInDatabase,
} from "@/lib/family-db";

import type {
  AccentColor,
  FamilyMember,
  MemberType,
} from "@/lib/family";

type NewMemberForm = {
  displayName: string;
  emoji: string;
  birthday: string;
  accent: AccentColor;
  memberType: MemberType;
};

const EMPTY_NEW_MEMBER: NewMemberForm = {
  displayName: "",
  emoji: "👶",
  birthday: "",
  accent: "amber",
  memberType: "child",
};

function parseLocalDate(
  dateString: string
): Date {
  const [
    year,
    month,
    day,
  ] = dateString
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function formatBirthday(
  dateString: string
): string {
  return parseLocalDate(
    dateString
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

function accentLabel(
  accent: AccentColor
): string {
  switch (accent) {
    case "blue":
      return "Blå";
    case "rose":
      return "Rosa";
    case "amber":
      return "Bärnsten";
  }
}

function accentClasses(
  accent: AccentColor
): string {
  switch (accent) {
    case "blue":
      return "border-blue-300/15 bg-blue-400/[0.06] text-blue-200";
    case "rose":
      return "border-rose-300/15 bg-rose-400/[0.06] text-rose-200";
    case "amber":
      return "border-amber-300/15 bg-amber-400/[0.06] text-amber-200";
  }
}

function cloneMember(
  member: FamilyMember
): FamilyMember {
  return {
    ...member,
    names:
      member.names.map(
        (item) => ({
          ...item,
          nameDay:
            item.nameDay
              ? {
                  ...item.nameDay,
                }
              : undefined,
        })
      ),
  };
}

export default function FamilyAdmin() {
  const [
    members,
    setMembers,
  ] =
    useState<
      FamilyMember[]
    >([]);

  const [
    editingMember,
    setEditingMember,
  ] =
    useState<
      FamilyMember | null
    >(null);

  const [
    newMember,
    setNewMember,
  ] =
    useState<NewMemberForm>(
      EMPTY_NEW_MEMBER
    );

  const [
    showAddMember,
    setShowAddMember,
  ] =
    useState(false);

  const [
    showArchived,
    setShowArchived,
  ] =
    useState(false);

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
    workingId,
    setWorkingId,
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

  const activeMembers =
    useMemo(
      () =>
        members
          .filter(
            (member) =>
              member.isActive
          )
          .sort(
            (a, b) =>
              a.sortOrder -
              b.sortOrder
          ),
      [members]
    );

  const archivedMembers =
    useMemo(
      () =>
        members
          .filter(
            (member) =>
              !member.isActive
          )
          .sort(
            (a, b) =>
              a.sortOrder -
              b.sortOrder
          ),
      [members]
    );

  const loadMembers =
    useCallback(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result =
          await getFamilyMembersFromDatabase();

        setMembers(
          result
        );
      } catch (error) {
        console.error(
          "Kunde inte hämta familjedata i Admin:",
          error
        );

        setErrorMessage(
          "Familjeuppgifterna kunde inte hämtas från databasen."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  function dispatchFamilyChange() {
    window.dispatchEvent(
      new Event(
        "family-data-changed"
      )
    );
  }

  function startEditing(
    member: FamilyMember
  ) {
    setSuccessMessage(null);
    setErrorMessage(null);
    setShowAddMember(false);

    setEditingMember(
      cloneMember(
        member
      )
    );
  }

  function cancelEditing() {
    setEditingMember(null);
    setErrorMessage(null);
  }

  function openAddMember() {
    setEditingMember(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    setNewMember({
      ...EMPTY_NEW_MEMBER,
    });

    setShowAddMember(true);
  }

  function closeAddMember() {
    setShowAddMember(false);

    setNewMember({
      ...EMPTY_NEW_MEMBER,
    });
  }

  async function addMember() {
    if (
      !newMember.displayName.trim()
    ) {
      setErrorMessage(
        "Namnet får inte vara tomt."
      );
      return;
    }

    if (
      !newMember.birthday
    ) {
      setErrorMessage(
        "Födelsedatum måste anges."
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await createFamilyMemberInDatabase(
        newMember
      );

      const displayName =
        newMember.displayName.trim();

      await loadMembers();

      closeAddMember();

      setSuccessMessage(
        `${displayName} har lagts till i familjen.`
      );

      dispatchFamilyChange();
    } catch (error) {
      console.error(
        "Kunde inte lägga till familjemedlem:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Personen kunde inte läggas till."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function updateNameDay(
    index: number,
    field:
      | "name"
      | "month"
      | "day",
    value: string
  ) {
    setEditingMember(
      (current) => {
        if (!current) {
          return current;
        }

        const names =
          current.names.map(
            (
              item,
              itemIndex
            ) => {
              if (
                itemIndex !==
                index
              ) {
                return item;
              }

              if (
                field ===
                "name"
              ) {
                return {
                  ...item,
                  name: value,
                };
              }

              const currentNameDay =
                item.nameDay ?? {
                  month: 1,
                  day: 1,
                };

              return {
                ...item,
                nameDay: {
                  ...currentNameDay,
                  [field]:
                    Number(
                      value
                    ),
                },
              };
            }
          );

        return {
          ...current,
          names,
        };
      }
    );
  }

  function addNameDay() {
    setEditingMember(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          names: [
            ...current.names,
            {
              name: "",
              nameDay: {
                month: 1,
                day: 1,
              },
            },
          ],
        };
      }
    );
  }

  function removeNameDay(
    index: number
  ) {
    setEditingMember(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          names:
            current.names.filter(
              (
                _,
                itemIndex
              ) =>
                itemIndex !==
                index
            ),
        };
      }
    );
  }

  async function saveMember() {
    if (
      !editingMember
    ) {
      return;
    }

    if (
      !editingMember.displayName.trim()
    ) {
      setErrorMessage(
        "Namnet får inte vara tomt."
      );
      return;
    }

    if (
      !editingMember.birthday
    ) {
      setErrorMessage(
        "Födelsedatum måste anges."
      );
      return;
    }

    const invalidNameDay =
      editingMember.names.some(
        (item) =>
          !item.name.trim() ||
          !item.nameDay ||
          item.nameDay.month < 1 ||
          item.nameDay.month > 12 ||
          item.nameDay.day < 1 ||
          item.nameDay.day > 31
      );

    if (
      invalidNameDay
    ) {
      setErrorMessage(
        "Kontrollera att alla namnsdagar har namn, månad 1–12 och dag 1–31."
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateFamilyMemberInDatabase(
        editingMember
      );

      setSuccessMessage(
        `${editingMember.displayName} har sparats.`
      );

      setEditingMember(null);

      await loadMembers();

      dispatchFamilyChange();
    } catch (error) {
      console.error(
        "Kunde inte spara familjemedlem:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ändringarna kunde inte sparas."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function moveMember(
    member: FamilyMember,
    direction:
      | "up"
      | "down"
  ) {
    const index =
      activeMembers.findIndex(
        (item) =>
          item.id ===
          member.id
      );

    if (
      index < 0
    ) {
      return;
    }

    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
        activeMembers.length
    ) {
      return;
    }

    const target =
      activeMembers[
        targetIndex
      ];

    setWorkingId(
      member.id
    );
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await moveFamilyMemberInDatabase(
        member,
        target
      );

      await loadMembers();

      dispatchFamilyChange();
    } catch (error) {
      console.error(
        "Kunde inte ändra ordning:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ordningen kunde inte ändras."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function archiveMember(
    member: FamilyMember
  ) {
    const confirmed =
      window.confirm(
        `Vill du arkivera ${member.displayName}? Personen försvinner från den aktiva familjen men datan sparas.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setWorkingId(
      member.id
    );
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await setFamilyMemberActiveInDatabase(
        member.id,
        false
      );

      await loadMembers();

      setSuccessMessage(
        `${member.displayName} har arkiverats.`
      );

      dispatchFamilyChange();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Personen kunde inte arkiveras."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function restoreMember(
    member: FamilyMember
  ) {
    setWorkingId(
      member.id
    );
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await setFamilyMemberActiveInDatabase(
        member.id,
        true
      );

      await loadMembers();

      setSuccessMessage(
        `${member.displayName} är aktiv igen.`
      );

      dispatchFamilyChange();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Personen kunde inte återaktiveras."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteMemberPermanently(
    member: FamilyMember
  ) {
    if (
      member.isActive ||
      workingId !== null
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Vill du ta bort ${member.displayName} permanent?\n\nDetta raderar personen och all kopplad data, inklusive namnsdagar, tillväxt, tänder och vaccinationer.\n\nDet går inte att ångra.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    const finalConfirmed =
      window.confirm(
        `Är du helt säker på att ${member.displayName} ska tas bort permanent?`
      );

    if (
      !finalConfirmed
    ) {
      return;
    }

    setWorkingId(
      member.id
    );
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await deleteFamilyMemberFromDatabase(
        member.id
      );

      await loadMembers();

      setSuccessMessage(
        `${member.displayName} har tagits bort permanent.`
      );

      dispatchFamilyChange();
    } catch (error) {
      console.error(
        "Kunde inte radera familjemedlem:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Personen kunde inte tas bort permanent."
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              <ArrowLeft
                size={17}
              />
              Till Admin
            </Link>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-blue-500 text-white">
                <Users
                  size={27}
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                  Admin
                </p>

                <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  Familjen
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Hantera familjemedlemmar och deras uppgifter.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void loadMembers()
              }
              disabled={
                isLoading ||
                isSaving
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/15 hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  isLoading
                    ? "animate-spin"
                    : ""
                }
              />
              Uppdatera
            </button>

            <button
              type="button"
              onClick={
                openAddMember
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              <UserPlus
                size={17}
              />
              Lägg till person
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <Check size={18} />
            {successMessage}
          </div>
        )}

        {errorMessage &&
          !isLoading && (
            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

        {isLoading ? (
          <div className="mt-5 flex min-h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/10">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <LoaderCircle
                size={30}
                className="animate-spin text-blue-400"
              />

              <p className="text-sm">
                Hämtar familjen…
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-300/15 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-semibold text-emerald-300">
                {activeMembers.length} aktiva
              </span>

              {archivedMembers.length >
                0 && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-400">
                  {archivedMembers.length} arkiverade
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-3">
              {activeMembers.map(
                (
                  member,
                  index
                ) => {
                  const TypeIcon =
                    member.memberType ===
                    "child"
                      ? Baby
                      : UserRound;

                  return (
                    <article
                      key={
                        member.id
                      }
                      className="overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-2xl shadow-black/20"
                    >
                      <div
                        className={`border-b p-5 ${accentClasses(
                          member.accent
                        )}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/25 text-3xl">
                            {member.emoji ||
                              "🙂"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                                <TypeIcon
                                  size={12}
                                />

                                {member.memberType ===
                                "child"
                                  ? "Barn"
                                  : "Vuxen"}
                              </span>

                              <span className="rounded-full border border-emerald-300/15 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-200">
                                Aktiv
                              </span>
                            </div>

                            <h2 className="mt-2 truncate text-2xl font-bold text-white">
                              {
                                member.displayName
                              }
                            </h2>
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                            <Cake
                              size={18}
                              className="mt-0.5 shrink-0 text-rose-300"
                            />

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">
                                Födelsedag
                              </p>

                              <p className="mt-1 font-semibold capitalize text-white">
                                {formatBirthday(
                                  member.birthday
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                            <Tag
                              size={18}
                              className="mt-0.5 shrink-0 text-blue-300"
                            />

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">
                                Accentfärg
                              </p>

                              <p className="mt-1 font-semibold text-white">
                                {accentLabel(
                                  member.accent
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={17}
                              className="text-violet-300"
                            />

                            <h3 className="text-sm font-bold text-white">
                              Namnsdagar
                            </h3>
                          </div>

                          <div className="mt-3 space-y-2">
                            {member.names.length ===
                            0 ? (
                              <p className="text-sm text-slate-500">
                                Inga namnsdagar registrerade.
                              </p>
                            ) : (
                              member.names.map(
                                (
                                  personName,
                                  nameIndex
                                ) => (
                                  <div
                                    key={`${member.id}-${personName.name}-${nameIndex}`}
                                    className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5"
                                  >
                                    <span className="font-medium text-slate-200">
                                      {
                                        personName.name
                                      }
                                    </span>

                                    <span className="text-sm capitalize text-slate-400">
                                      {personName.nameDay
                                        ? formatNameDay(
                                            personName.nameDay.month,
                                            personName.nameDay.day
                                          )
                                        : "Ingen namnsdag"}
                                    </span>
                                  </div>
                                )
                              )
                            )}
                          </div>
                        </div>

                        <div className="mt-5 flex items-center gap-2">
                          <div className="flex overflow-hidden rounded-xl border border-white/10">
                            <button
                              type="button"
                              disabled={
                                workingId !==
                                  null ||
                                index ===
                                  0
                              }
                              onClick={() =>
                                void moveMember(
                                  member,
                                  "up"
                                )
                              }
                              className="flex h-11 w-11 items-center justify-center bg-white/[0.05] text-slate-300 transition hover:bg-white/10 disabled:opacity-25"
                              aria-label={`Flytta ${member.displayName} upp`}
                            >
                              <ArrowUp
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
                              className="flex h-11 w-11 items-center justify-center border-l border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-white/10 disabled:opacity-25"
                              aria-label={`Flytta ${member.displayName} ner`}
                            >
                              <ArrowDown
                                size={17}
                              />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              startEditing(
                                member
                              )
                            }
                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 px-3 text-sm font-semibold text-white transition hover:bg-blue-400"
                          >
                            <Pencil
                              size={16}
                            />
                            Redigera
                          </button>

                          <button
                            type="button"
                            disabled={
                              workingId !==
                              null
                            }
                            onClick={() =>
                              void archiveMember(
                                member
                              )
                            }
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-400/[0.06] text-amber-300 transition hover:bg-amber-400/15 disabled:opacity-40"
                            aria-label={`Arkivera ${member.displayName}`}
                          >
                            {workingId ===
                            member.id ? (
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
                    </article>
                  );
                }
              )}
            </div>

            {archivedMembers.length >
              0 && (
              <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05]">
                <button
                  type="button"
                  onClick={() =>
                    setShowArchived(
                      (current) =>
                        !current
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <Archive
                      size={19}
                      className="text-slate-400"
                    />

                    <div>
                      <p className="font-bold text-white">
                        Arkiverade familjemedlemmar
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {archivedMembers.length} personer
                      </p>
                    </div>
                  </div>

                  {showArchived ? (
                    <ChevronUp
                      size={19}
                    />
                  ) : (
                    <ChevronDown
                      size={19}
                    />
                  )}
                </button>

                {showArchived && (
                  <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {archivedMembers.map(
                      (member) => (
                        <div
                          key={
                            member.id
                          }
                          className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/25 p-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="text-2xl">
                              {
                                member.emoji
                              }
                            </span>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">
                                {
                                  member.displayName
                                }
                              </p>

                              <p className="text-xs text-slate-500">
                                {member.memberType ===
                                "child"
                                  ? "Barn"
                                  : "Vuxen"}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
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
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] text-emerald-300 transition hover:bg-emerald-400/15 disabled:opacity-40"
                              aria-label={`Återaktivera ${member.displayName}`}
                              title="Återaktivera"
                            >
                              {workingId ===
                              member.id ? (
                                <LoaderCircle
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <ArchiveRestore
                                  size={17}
                                />
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={
                                workingId !==
                                null
                              }
                              onClick={() =>
                                void deleteMemberPermanently(
                                  member
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-300/20 bg-red-400/[0.07] text-red-300 transition hover:border-red-300/30 hover:bg-red-400/15 hover:text-red-200 disabled:opacity-40"
                              aria-label={`Ta bort ${member.displayName} permanent`}
                              title="Ta bort permanent"
                            >
                              {workingId ===
                              member.id ? (
                                <LoaderCircle
                                  size={16}
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
                      )
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {showAddMember && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center">
            <div className="my-4 w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950 p-5 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
                    Ny familjemedlem
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-white">
                    Lägg till person
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    closeAddMember
                  }
                  disabled={
                    isSaving
                  }
                  className="rounded-xl border border-white/10 bg-white/10 p-2 text-slate-400 transition hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_110px]">
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Visningsnamn
                  </span>

                  <input
                    value={
                      newMember.displayName
                    }
                    onChange={(
                      event
                    ) =>
                      setNewMember(
                        {
                          ...newMember,
                          displayName:
                            event.target.value,
                        }
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-white outline-none focus:border-blue-400/50"
                  />
                </label>

                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Emoji
                  </span>

                  <input
                    value={
                      newMember.emoji
                    }
                    onChange={(
                      event
                    ) =>
                      setNewMember(
                        {
                          ...newMember,
                          emoji:
                            event.target.value,
                        }
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-center text-xl text-white outline-none"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Typ
                  </span>

                  <select
                    value={
                      newMember.memberType
                    }
                    onChange={(
                      event
                    ) => {
                      const memberType =
                        event.target
                          .value as MemberType;

                      setNewMember({
                        ...newMember,
                        memberType,
                        emoji:
                          memberType ===
                          "child"
                            ? "👶"
                            : "👤",
                      });
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none"
                  >
                    <option value="adult">
                      Vuxen
                    </option>

                    <option value="child">
                      Barn
                    </option>
                  </select>
                </label>

                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Födelsedatum
                  </span>

                  <input
                    type="date"
                    value={
                      newMember.birthday
                    }
                    onChange={(
                      event
                    ) =>
                      setNewMember(
                        {
                          ...newMember,
                          birthday:
                            event.target.value,
                        }
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-white outline-none"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Accentfärg
                </span>

                <select
                  value={
                    newMember.accent
                  }
                  onChange={(
                    event
                  ) =>
                    setNewMember(
                      {
                        ...newMember,
                        accent:
                          event.target
                            .value as AccentColor,
                      }
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none"
                >
                  <option value="blue">
                    Blå
                  </option>

                  <option value="rose">
                    Rosa
                  </option>

                  <option value="amber">
                    Bärnsten
                  </option>
                </select>
              </label>

              <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={
                    closeAddMember
                  }
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300"
                >
                  Avbryt
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void addMember()
                  }
                  disabled={
                    isSaving
                  }
                  className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50"
                >
                  {isSaving ? (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <UserPlus
                      size={16}
                    />
                  )}

                  Lägg till
                </button>
              </div>
            </div>
          </div>
        )}

        {editingMember && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center">
            <div className="my-4 w-full max-w-2xl rounded-[2rem] border border-white/10 bg-slate-950 p-5 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
                    Redigera familjemedlem
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-white">
                    {
                      editingMember.displayName
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    cancelEditing
                  }
                  disabled={
                    isSaving
                  }
                  className="rounded-xl border border-white/10 bg-white/10 p-2 text-slate-400 transition hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_110px]">
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Visningsnamn
                  </span>

                  <input
                    value={
                      editingMember.displayName
                    }
                    onChange={(
                      event
                    ) =>
                      setEditingMember({
                        ...editingMember,
                        displayName:
                          event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-white outline-none"
                  />
                </label>

                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Emoji
                  </span>

                  <input
                    value={
                      editingMember.emoji
                    }
                    onChange={(
                      event
                    ) =>
                      setEditingMember({
                        ...editingMember,
                        emoji:
                          event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-center text-xl text-white outline-none"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Typ
                  </span>

                  <select
                    value={
                      editingMember.memberType
                    }
                    onChange={(
                      event
                    ) =>
                      setEditingMember({
                        ...editingMember,
                        memberType:
                          event.target
                            .value as MemberType,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none"
                  >
                    <option value="adult">
                      Vuxen
                    </option>

                    <option value="child">
                      Barn
                    </option>
                  </select>
                </label>

                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Födelsedatum
                  </span>

                  <input
                    type="date"
                    value={
                      editingMember.birthday
                    }
                    onChange={(
                      event
                    ) =>
                      setEditingMember({
                        ...editingMember,
                        birthday:
                          event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-white outline-none"
                  />
                </label>

                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Accentfärg
                  </span>

                  <select
                    value={
                      editingMember.accent
                    }
                    onChange={(
                      event
                    ) =>
                      setEditingMember({
                        ...editingMember,
                        accent:
                          event.target
                            .value as AccentColor,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none"
                  >
                    <option value="blue">
                      Blå
                    </option>

                    <option value="rose">
                      Rosa
                    </option>

                    <option value="amber">
                      Bärnsten
                    </option>
                  </select>
                </label>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white">
                      Namnsdagar
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      Namn, månad och dag.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      addNameDay
                    }
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200"
                  >
                    <Plus
                      size={15}
                    />
                    Lägg till
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {editingMember.names.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                        className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[1fr_90px_90px_42px]"
                      >
                        <input
                          value={
                            item.name
                          }
                          onChange={(
                            event
                          ) =>
                            updateNameDay(
                              index,
                              "name",
                              event.target.value
                            )
                          }
                          placeholder="Namn"
                          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                        />

                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={
                            item.nameDay?.month ??
                            1
                          }
                          onChange={(
                            event
                          ) =>
                            updateNameDay(
                              index,
                              "month",
                              event.target.value
                            )
                          }
                          aria-label="Månad"
                          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                        />

                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={
                            item.nameDay?.day ??
                            1
                          }
                          onChange={(
                            event
                          ) =>
                            updateNameDay(
                              index,
                              "day",
                              event.target.value
                            )
                          }
                          aria-label="Dag"
                          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeNameDay(
                              index
                            )
                          }
                          className="flex items-center justify-center rounded-xl border border-red-300/10 bg-red-400/[0.05] text-red-300"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    cancelEditing
                  }
                  disabled={
                    isSaving
                  }
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300"
                >
                  Avbryt
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void saveMember()
                  }
                  disabled={
                    isSaving
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isSaving ? (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Save
                      size={16}
                    />
                  )}

                  {isSaving
                    ? "Sparar…"
                    : "Spara ändringar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}