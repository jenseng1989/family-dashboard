"use client";

import {
  LoaderCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import ChildOverview from "@/components/dashboard/ChildOverview";
import FamilyTabs from "@/components/dashboard/FamilyTabs";
import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import PersonOverview from "@/components/dashboard/PersonOverview";
import WidgetGate from "@/components/dashboard/WidgetGate";

import {
  adultFamilyWidgetTemplates,
  childFamilyWidgetTemplates,
} from "@/config/widgets";
import {
  buildDynamicFamilyWidgets,
} from "@/lib/dashboard-widgets";
import {
  getFamilyMembersFromDatabase,
} from "@/lib/family-db";
import type {
  FamilyMember,
} from "@/lib/family";

type DynamicFamilySectionProps = {
  sharedContent: React.ReactNode;
};

function FamilyWidgetLoading({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex min-h-48 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-3 text-slate-400">
        <LoaderCircle
          size={20}
          className="animate-spin text-emerald-300"
        />

        <span className="text-sm font-semibold">
          Laddar {label}…
        </span>
      </div>
    </div>
  );
}

/*
 * De tyngre familjekomponenterna ligger i egna chunks.
 * Översikterna ligger kvar statiskt så varje personflik
 * fortfarande öppnas snabbt och direkt.
 */
const ChildGrowth = dynamic(
  () =>
    import(
      "@/components/dashboard/ChildGrowth"
    ),
  {
    loading: () => (
      <FamilyWidgetLoading label="tillväxt" />
    ),
  }
);

const ChildTeeth = dynamic(
  () =>
    import(
      "@/components/dashboard/ChildTeeth"
    ),
  {
    loading: () => (
      <FamilyWidgetLoading label="tänder" />
    ),
  }
);

const ChildVaccinations = dynamic(
  () =>
    import(
      "@/components/dashboard/ChildVaccinations"
    ),
  {
    loading: () => (
      <FamilyWidgetLoading label="vaccinationer" />
    ),
  }
);

const PersonalCenter = dynamic(
  () =>
    import(
      "@/components/dashboard/PersonalCenter"
    ),
  {
    loading: () => (
      <FamilyWidgetLoading label="personligt center" />
    ),
  }
);

function ChildContent({
  member,
}: {
  member: FamilyMember;
}) {
  const prefix =
    `child-${member.id}`;

  const contentMap = {
    overview: (
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

    growth: (
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

    weight: (
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

    height: (
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

    teeth: (
      <ChildTeeth
        memberId={
          member.id
        }
        displayName={
          member.displayName
        }
      />
    ),

    vaccinations: (
      <ChildVaccinations
        memberId={
          member.id
        }
        displayName={
          member.displayName
        }
      />
    ),

    history: (
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
  };

  const widgets =
    buildDynamicFamilyWidgets(
      childFamilyWidgetTemplates,
      prefix,
      contentMap
    );

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

function AdultContent({
  member,
}: {
  member: FamilyMember;
}) {
  const prefix =
    `adult-${member.id}`;

  const contentMap = {
    overview: (
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

    "personal-center": (
      <PersonalCenter
        memberId={
          member.id
        }
        displayName={
          member.displayName
        }
      />
    ),
  };

  const widgets =
    buildDynamicFamilyWidgets(
      adultFamilyWidgetTemplates,
      prefix,
      contentMap
    );

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
        member={
          member
        }
      />
    );
  }

  return (
    <AdultContent
      member={
        member
      }
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
    useCallback(
      async () => {
        setIsLoading(
          true
        );
        setErrorMessage(
          null
        );

        try {
          const result =
            await getFamilyMembersFromDatabase();

          setMembers(
            result
          );
        } catch (
          error
        ) {
          console.error(
            "Kunde inte hämta familjemedlemmar:",
            error
          );

          setErrorMessage(
            "Familjemedlemmarna kunde inte hämtas."
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      []
    );

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
  }, [
    loadMembers,
  ]);

  const activeMembers =
    useMemo(
      () =>
        members
          .filter(
            (
              member
            ) =>
              member.isActive
          )
          .sort(
            (
              a,
              b
            ) =>
              a.sortOrder -
              b.sortOrder
          ),
      [
        members,
      ]
    );

  if (
    isLoading
  ) {
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

  if (
    errorMessage
  ) {
    return (
      <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">
        {
          errorMessage
        }
      </div>
    );
  }

  const personTabs =
    activeMembers.map(
      (
        member
      ) => ({
        id:
          member.id,
        label:
          member.displayName,
        emoji:
          member.emoji,
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
