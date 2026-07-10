export type AccentColor = "blue" | "rose" | "amber";

export type FamilyName = {
  name: string;
  nameDay?: {
    month: number;
    day: number;
  };
};

export type FamilyMember = {
  id: string;
  displayName: string;
  emoji: string;
  birthday: string;
  accent: AccentColor;
  names: FamilyName[];
};

export type FamilyTimelineItem = {
  id: string;
  displayName: string;
  emoji: string;
  accent: AccentColor;
  names: FamilyName[];
  ageYears: number;
  ageDaysAfterBirthday: number;
  nextAge: number;
  daysUntilBirthday: number;
  yearProgress: number;
  nextBirthday: string;
};

export type FamilyEvent = {
  id: string;
  memberId: string;
  displayName: string;
  emoji: string;
  accent: AccentColor;
  type: "birthday" | "nameDay";
  eventName?: string;
  date: string;
  daysUntil: number;
  title: string;
};

export const familyMembers: FamilyMember[] = [
  {
    id: "jens",
    displayName: "Jens",
    emoji: "👨",
    birthday: "1989-11-27",
    accent: "blue",
    names: [
      {
        name: "Jens",
        nameDay: {
          month: 3,
          day: 29,
        },
      },
      {
        name: "Axel",
        nameDay: {
          month: 6,
          day: 16,
        },
      },
      {
        name: "Wilhelm",
        nameDay: {
          month: 4,
          day: 6,
        },
      },
    ],
  },
  {
    id: "lenita",
    displayName: "Lenita",
    emoji: "👩",
    birthday: "1987-04-25",
    accent: "rose",
    names: [
      {
        name: "Lenita",
        nameDay: {
          month: 8,
          day: 18,
        },
      },
      {
        name: "Elise",
        nameDay: {
          month: 9,
          day: 20,
        },
      },
    ],
  },
  {
    id: "signe",
    displayName: "Signe",
    emoji: "👶",
    birthday: "2026-04-30",
    accent: "amber",
    names: [
      {
        name: "Signe",
        nameDay: {
          month: 8,
          day: 23,
        },
      },
      {
        name: "Elise",
        nameDay: {
          month: 9,
          day: 20,
        },
      },
      {
        name: "Lea",
        nameDay: {
          month: 6,
          day: 26,
        },
      },
    ],
  },
];

function createLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function createDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(start: Date, end: Date): number {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  const endUtc = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );

  return Math.round((endUtc - startUtc) / millisecondsPerDay);
}

function createAnnualDate(
  month: number,
  day: number,
  year: number
): Date {
  return new Date(year, month - 1, day);
}

function getNextAnnualDate(
  month: number,
  day: number,
  today: Date
): Date {
  let nextDate = createAnnualDate(
    month,
    day,
    today.getFullYear()
  );

  if (nextDate < today) {
    nextDate = createAnnualDate(
      month,
      day,
      today.getFullYear() + 1
    );
  }

  return nextDate;
}

export function getFamilyTimeline(): FamilyTimelineItem[] {
  const today = startOfDay(new Date());

  return familyMembers.map((member) => {
    const birthday = createLocalDate(member.birthday);

    let latestBirthday = new Date(
      today.getFullYear(),
      birthday.getMonth(),
      birthday.getDate()
    );

    if (latestBirthday > today) {
      latestBirthday = new Date(
        today.getFullYear() - 1,
        birthday.getMonth(),
        birthday.getDate()
      );
    }

    let nextBirthday = new Date(
      today.getFullYear(),
      birthday.getMonth(),
      birthday.getDate()
    );

    if (nextBirthday < today) {
      nextBirthday = new Date(
        today.getFullYear() + 1,
        birthday.getMonth(),
        birthday.getDate()
      );
    }

    const ageYears =
      latestBirthday.getFullYear() - birthday.getFullYear();

    const ageDaysAfterBirthday = daysBetween(
      latestBirthday,
      today
    );

    const daysUntilBirthday = daysBetween(
      today,
      nextBirthday
    );

    const daysInBirthdayYear = daysBetween(
      latestBirthday,
      nextBirthday
    );

    const yearProgress =
      daysInBirthdayYear > 0
        ? Math.min(
            100,
            Math.max(
              0,
              (ageDaysAfterBirthday / daysInBirthdayYear) * 100
            )
          )
        : 0;

    return {
      id: member.id,
      displayName: member.displayName,
      emoji: member.emoji,
      accent: member.accent,
      names: member.names,
      ageYears,
      ageDaysAfterBirthday,
      nextAge: ageYears + 1,
      daysUntilBirthday,
      yearProgress,
      nextBirthday: createDateString(nextBirthday),
    };
  });
}

export function getUpcomingFamilyEvents(): FamilyEvent[] {
  const today = startOfDay(new Date());
  const events: FamilyEvent[] = [];

  familyMembers.forEach((member) => {
    const birthday = createLocalDate(member.birthday);

    const nextBirthday = getNextAnnualDate(
      birthday.getMonth() + 1,
      birthday.getDate(),
      today
    );

    const currentAge =
      nextBirthday.getFullYear() - birthday.getFullYear() - 1;

    events.push({
      id: `${member.id}-birthday`,
      memberId: member.id,
      displayName: member.displayName,
      emoji: member.emoji,
      accent: member.accent,
      type: "birthday",
      date: createDateString(nextBirthday),
      daysUntil: daysBetween(today, nextBirthday),
      title: `${member.displayName} fyller ${currentAge + 1} år`,
    });

    member.names.forEach((personName) => {
      if (!personName.nameDay) {
        return;
      }

      const nextNameDay = getNextAnnualDate(
        personName.nameDay.month,
        personName.nameDay.day,
        today
      );

      events.push({
        id: `${member.id}-nameday-${personName.name.toLowerCase()}`,
        memberId: member.id,
        displayName: member.displayName,
        emoji: member.emoji,
        accent: member.accent,
        type: "nameDay",
        eventName: personName.name,
        date: createDateString(nextNameDay),
        daysUntil: daysBetween(today, nextNameDay),
        title: `${personName.name} har namnsdag`,
      });
    });
  });

  return events.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) {
      return a.daysUntil - b.daysUntil;
    }

    return a.title.localeCompare(b.title, "sv-SE");
  });
}

export function formatFamilyDate(dateString: string): string {
  return createLocalDate(dateString).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatShortFamilyDate(
  month: number,
  day: number
): string {
  const date = new Date(2026, month - 1, day);

  return date.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
  });
}

export function getCountdownText(days: number): string {
  if (days === 0) {
    return "Idag! 🎉";
  }

  if (days === 1) {
    return "Imorgon";
  }

  return `${days} dagar kvar`;
}