"use client";

import {
  ArrowLeft,
  Cake,
  CalendarDays,
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Tag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  getFamilyMembersFromDatabase,
  updateFamilyMemberInDatabase,
} from "@/lib/family-db";
import type {
  AccentColor,
  FamilyMember,
} from "@/lib/family";

function parseLocalDate(
  dateString: string
): Date {
  const [
    year,
    month,
    day,
  ] =
    dateString
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

  const loadMembers =
    useCallback(async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result =
          await getFamilyMembersFromDatabase();

        const preferredOrder = [
          "jens",
          "lenita",
          "signe",
        ];

        const sorted =
          [...result].sort(
            (
              a,
              b
            ) => {
              const aIndex =
                preferredOrder.indexOf(
                  a.id
                );

              const bIndex =
                preferredOrder.indexOf(
                  b.id
                );

              if (
                aIndex === -1 &&
                bIndex === -1
              ) {
                return a.displayName.localeCompare(
                  b.displayName,
                  "sv-SE"
                );
              }

              if (
                aIndex === -1
              ) {
                return 1;
              }

              if (
                bIndex === -1
              ) {
                return -1;
              }

              return (
                aIndex -
                bIndex
              );
            }
          );

        setMembers(
          sorted
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

  function startEditing(
    member: FamilyMember
  ) {
    setSuccessMessage(null);
    setErrorMessage(null);
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

      setMembers(
        (current) =>
          current.map(
            (member) =>
              member.id ===
              editingMember.id
                ? cloneMember(
                    editingMember
                  )
                : member
          )
      );

      setSuccessMessage(
        `${editingMember.displayName} har sparats.`
      );

      setEditingMember(null);

      window.dispatchEvent(
        new Event(
          "family-data-changed"
        )
      );
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

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]"><div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
              <UserRound
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
                Visa och redigera familjeuppgifter i databasen.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadMembers()
          }
          disabled={
            isLoading ||
            isSaving
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>

      {successMessage && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <Check
            size={18}
          />
          {successMessage}
        </div>
      )}

      {errorMessage && !isLoading && (
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
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          {members.map(
            (member) => (
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

                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">
                        Familjemedlem
                      </p>

                      <h2 className="mt-1 truncate text-2xl font-bold text-white">
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
                      {member.names.map(
                        (
                          personName,
                          index
                        ) => (
                          <div
                            key={`${member.id}-${personName.name}-${index}`}
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
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      startEditing(
                        member
                      )
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
                  >
                    <Pencil
                      size={16}
                    />
                    Redigera
                  </button>
                </div>
              </article>
            )
          )}
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
                <X
                  size={20}
                />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_110px]">
              <label className="block">
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
                    setEditingMember(
                      {
                        ...editingMember,
                        displayName:
                          event
                            .target
                            .value,
                      }
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-white outline-none focus:border-blue-400/50"
                />
              </label>

              <label className="block">
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
                    setEditingMember(
                      {
                        ...editingMember,
                        emoji:
                          event
                            .target
                            .value,
                      }
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-center text-xl text-white outline-none focus:border-blue-400/50"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
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
                    setEditingMember(
                      {
                        ...editingMember,
                        birthday:
                          event
                            .target
                            .value,
                      }
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-white outline-none focus:border-blue-400/50"
                />
              </label>

              <label className="block">
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
                    setEditingMember(
                      {
                        ...editingMember,
                        accent:
                          event
                            .target
                            .value as AccentColor,
                      }
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-blue-400/50"
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
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
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
                            event
                              .target
                              .value
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
                            event
                              .target
                              .value
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
                            event
                              .target
                              .value
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
                        aria-label="Ta bort namnsdag"
                        className="flex items-center justify-center rounded-xl border border-red-300/10 bg-red-400/[0.05] text-red-300 transition hover:bg-red-400/10"
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
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
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
    </div></main>
  );
}
