"use client";

import {
  LoaderCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import ChildGrowth from "@/components/dashboard/ChildGrowth";
import ChildOverview from "@/components/dashboard/ChildOverview";
import ChildTeeth from "@/components/dashboard/ChildTeeth";
import ChildVaccinations from "@/components/dashboard/ChildVaccinations";
import FamilyTabs from "@/components/dashboard/FamilyTabs";
import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import PersonOverview from "@/components/dashboard/PersonOverview";
import PersonalCenter from "@/components/dashboard/PersonalCenter";
import WidgetGate from "@/components/dashboard/WidgetGate";

import { getFamilyMembersFromDatabase } from "@/lib/family-db";
import type { FamilyMember } from "@/lib/family";

type DynamicFamilySectionProps = {
  sharedContent: React.ReactNode;
};

type PersonalCenterOwner =
  | "jens"
  | "lenita";

function slugify(
  value: string
): string {
  return value
    .trim()
    .toLocaleLowerCase(
      "sv-SE"
    )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function isPersonalCenterOwner(
  value: string
): value is PersonalCenterOwner {
  return (
    value === "jens" ||
    value === "lenita"
  );
}

function ChildContent({
  member,
}: {
  member: FamilyMember;
}) {
  const childPrefix =
    `child-${member.id}`;

  return (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={
        WidgetGate
      }
      widgets={[
        {
          id: `${childPrefix}-overview`,
          className:
            "col-span-12 min-w-0",
          content: (
            <ChildOverview
              memberId={
                member.id
              }
              displayName={
                member.displayName
              }
              emoji={
                member.emoji
              }
            />
          ),
        },
        {
          id: `${childPrefix}-growth`,
          className:
            "col-span-12 min-w-0",
          content: (
            <ChildGrowth
              memberId={
                member.id
              }
              displayName={
                member.displayName
              }
              section="growth"
            />
          ),
        },
        {
          id: `${childPrefix}-weight`,
          className:
            "col-span-12 min-w-0",
          content: (
            <ChildGrowth
              memberId={
                member.id
              }
              displayName={
                member.displayName
              }
              section="weight"
            />
          ),
        },
        {
          id: `${childPrefix}-height`,
          className:
            "col-span-12 min-w-0",
          content: (
            <ChildGrowth
              memberId={
                member.id
              }
              displayName={
                member.displayName
              }
              section="height"
            />
          ),
        },
        {
          id: `${childPrefix}-teeth`,
          className:
            "col-span-12 min-w-0",
          content: (
            <ChildTeeth
              memberId={
                member.id
              }
              displayName={
                member.displayName
              }
            />
          ),
        },
        {
          id: `${childPrefix}-vaccinations`,
          className:
            "col-span-12 min-w-0",
          content: (
            <ChildVaccinations
              memberId={
                member.id
              }
              displayName={
                member.displayName
              }
            />
          ),
        },
        {
          id: `${childPrefix}-history`,
          className:
            "col-span-12 min-w-0",
          content: (
            <ChildGrowth
              memberId={
                member.id
              }
              displayName={
                member.displayName
              }
              section="history"
            />
          ),
        },
      ]}
    />
  );
}

function AdultContent({
  member,
}: {
  member: FamilyMember;
}) {
  const slug =
    slugify(
      member.displayName
    ) || member.id;

  const widgets = [
    {
      id: `${slug}-overview`,
      className:
        "col-span-12 min-w-0",
      content: (
        <PersonOverview
          displayName={
            member.displayName
          }
          fallbackEmoji={
            member.emoji ||
            "👤"
          }
        />
      ),
    },
  ];

  if (
    isPersonalCenterOwner(
      slug
    )
  ) {
    widgets.push({
      id: `${slug}-personal-center`,
      className:
        "col-span-12 min-w-0",
      content: (
        <PersonalCenter
          owner={slug}
          displayName={
            member.displayName
          }
        />
      ),
    });
  }

  return (
    <OrderedWidgetGroup
      wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5"
      itemComponent={
        WidgetGate
      }
      widgets={
        widgets
      }
    />
  );
}

function PersonContent({
  member,
}: {
  member: FamilyMember;
}) {
  if (
    member.memberType ===
    "child"
  ) {
    return (
      <ChildContent
        member={member}
      />
    );
  }

  return (
    <AdultContent
      member={member}
    />
  );
}

export default function DynamicFamilySection({
  sharedContent,
}: DynamicFamilySectionProps) {
  const [
    members,
    setMembers,
  ] =
    useState<
      FamilyMember[]
    >([]);

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
          "Kunde inte hämta familjemedlemmar:",
          error
        );

        setErrorMessage(
          "Familjemedlemmarna kunde inte hämtas."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadMembers();

    function handleFamilyChange() {
      void loadMembers();
    }

    window.addEventListener(
      "family-data-changed",
      handleFamilyChange
    );

    return () => {
      window.removeEventListener(
        "family-data-changed",
        handleFamilyChange
      );
    };
  }, [loadMembers]);

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

  if (isLoading) {
    return (
      <div className="flex min-h-52 w-full items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <LoaderCircle
            size={28}
            className="animate-spin text-emerald-400"
          />

          <p className="text-sm">
            Hämtar familjen…
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">
        {errorMessage}
      </div>
    );
  }

  const personTabs =
    activeMembers.map(
      (member) => ({
        id: member.id,
        label:
          member.displayName,
        emoji:
          member.emoji ||
          (member.memberType ===
          "child"
            ? "👶"
            : "👤"),
        memberType:
          member.memberType,
        content: (
          <PersonContent
            key={
              member.id
            }
            member={
              member
            }
          />
        ),
      })
    );

  return (
    <FamilyTabs
      sharedContent={
        sharedContent
      }
      personTabs={
        personTabs
      }
    />
  );
}