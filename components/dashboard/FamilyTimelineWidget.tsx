"use client";

import {
  CalendarDays,
  Cake,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  UserCog,
  Users,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Card from "@/components/ui/Card";
import FamilyManagerWidget from "@/components/dashboard/FamilyManagerWidget";
import {
  createFamilyTimeline,
  createUpcomingFamilyEvents,
  formatFamilyDate,
  getCountdownText,
  type FamilyMember,
} from "@/lib/family";
import {
  getFamilyMembersFromDatabase,
} from "@/lib/family-db";

function getAccentClasses(
  accent: FamilyMember["accent"]
): {
  border: string;
  background: string;
  text: string;
  progress: string;
} {
  switch (accent) {
    case "rose":
      return {
        border:
          "border-rose-300/20",
        background:
          "bg-rose-400/[0.07]",
        text:
          "text-rose-300",
        progress:
          "bg-rose-400",
      };

    case "amber":
      return {
        border:
          "border-amber-300/20",
        background:
          "bg-amber-400/[0.07]",
        text:
          "text-amber-300",
        progress:
          "bg-amber-400",
      };

    case "blue":
    default:
      return {
        border:
          "border-blue-300/20",
        background:
          "bg-blue-400/[0.07]",
        text:
          "text-blue-300",
        progress:
          "bg-blue-400",
      };
  }
}

export default function FamilyTimelineWidget() {
  const [
    members,
    setMembers,
  ] =
    useState<FamilyMember[]>(
      []
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    adminOpen,
    setAdminOpen,
  ] = useState(false);

  const loadFamily =
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
          "Kunde inte hämta familjedata:",
          error
        );

        setErrorMessage(
          "Familjedata kunde inte hämtas från databasen."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadFamily();

    function handleFamilyDataChanged() {
      void loadFamily();
    }

    window.addEventListener(
      "family-data-changed",
      handleFamilyDataChanged
    );

    return () => {
      window.removeEventListener(
        "family-data-changed",
        handleFamilyDataChanged
      );
    };
  }, [loadFamily]);

  const timeline =
    useMemo(
      () =>
        createFamilyTimeline(
          members
        ),
      [members]
    );

  const upcomingEvents =
    useMemo(
      () =>
        createUpcomingFamilyEvents(
          members
        ).slice(
          0,
          8
        ),
      [members]
    );

  return (
    <>
      <Card
      title="Family Timeline"
      icon={
        <Users
          size={28}
        />
      }
      storageKey="family-timeline"
    >
      {isLoading ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <LoaderCircle
            size={30}
            className="animate-spin text-blue-300"
          />

          <p className="text-sm text-slate-400">
            Hämtar familjen…
          </p>
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
          <p className="font-semibold text-red-200">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadFamily()
            }
            className="mt-4 flex items-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
          >
            <RefreshCw
              size={16}
            />

            Försök igen
          </button>
        </div>
      ) : members.length ===
        0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
          <Users
            size={34}
            className="mx-auto text-blue-300"
          />

          <p className="mt-3 font-semibold text-white">
            Inga familjemedlemmar
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Lägg till personer i databasen så visas de här.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {timeline.map(
              (member) => {
                const accent =
                  getAccentClasses(
                    member.accent
                  );

                return (
                  <article
                    key={
                      member.id
                    }
                    className={[
                      "rounded-2xl border p-5",
                      accent.border,
                      accent.background,
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-4xl">
                        {
                          member.emoji
                        }
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xl font-bold text-white">
                          {
                            member.displayName
                          }
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {
                            member.ageYears
                          }{" "}
                          år och{" "}
                          {
                            member.ageDaysAfterBirthday
                          }{" "}
                          dagar
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-400">
                          Nästa födelsedag
                        </span>

                        <span
                          className={[
                            "font-semibold",
                            accent.text,
                          ].join(
                            " "
                          )}
                        >
                          {getCountdownText(
                            member.daysUntilBirthday
                          )}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-semibold capitalize text-white">
                        {formatFamilyDate(
                          member.nextBirthday
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Fyller{" "}
                        {
                          member.nextAge
                        }{" "}
                        år
                      </p>
                    </div>

                    <div className="mt-4">
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={[
                            "h-full rounded-full transition-all",
                            accent.progress,
                          ].join(
                            " "
                          )}
                          style={{
                            width:
                              `${member.yearProgress}%`,
                          }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        {
                          Math.round(
                            member.yearProgress
                          )
                        }
                        % till nästa födelsedag
                      </p>
                    </div>

                    {member.names.length >
                      0 && (
                      <div className="mt-4 border-t border-white/10 pt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Namn
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {member.names.map(
                            (
                              personName
                            ) => (
                              <span
                                key={`${member.id}-${personName.name}`}
                                className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300"
                              >
                                {
                                  personName.name
                                }
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays
                size={18}
                className="text-blue-300"
              />

              <h3 className="font-semibold text-white">
                Kommande familjehändelser
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {upcomingEvents.map(
                (event) => (
                  <article
                    key={
                      event.id
                    }
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
                      {event.type ===
                      "birthday" ? (
                        <Cake
                          size={19}
                          className="text-rose-300"
                        />
                      ) : (
                        <Sparkles
                          size={19}
                          className="text-amber-300"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-white">
                        {
                          event.title
                        }
                      </p>

                      <p className="mt-1 text-xs capitalize text-slate-500">
                        {formatFamilyDate(
                          event.date
                        )}
                        {" · "}
                        {getCountdownText(
                          event.daysUntil
                        )}
                      </p>
                    </div>
                  </article>
                )
              )}
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-300/10 bg-blue-400/[0.05] p-4">
            <RefreshCw
              size={17}
              className="mt-0.5 shrink-0 text-blue-300"
            />

            <p className="text-xs leading-5 text-slate-500">
              Familjemedlemmar, födelsedagar och namnsdagar hämtas från Supabase och uppdateras automatiskt när du ändrar familjen.
            </p>
          </div>

          <div className="mt-4 flex justify-end border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() =>
                setAdminOpen(true)
              }
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-blue-300/20 hover:bg-blue-400/10 hover:text-blue-100"
            >
              <UserCog
                size={15}
              />

              Administrera personer
            </button>
          </div>
        </>
      )}
      </Card>

      {adminOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Administrera personer"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setAdminOpen(false);
            }
          }}
        >
          <div className="relative my-4 w-full max-w-5xl sm:my-8">
            <button
              type="button"
              onClick={() =>
                setAdminOpen(false)
              }
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900/90 text-slate-300 shadow-lg transition hover:bg-slate-800 hover:text-white"
              aria-label="Stäng administrationen"
            >
              <X
                size={19}
              />
            </button>

            <FamilyManagerWidget />
          </div>
        </div>
      )}
    </>
  );
}