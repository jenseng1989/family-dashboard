import {
  VacationDay,
  VacationFieldsForm,
} from "@/components/dashboard/vacation/vacation-types";

export function getTodayString(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseLocalDate(
  dateString: string
): Date {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

export function formatVacationDate(
  dateString: string
): string {
  return parseLocalDate(dateString).toLocaleDateString(
    "sv-SE",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  );
}

export function formatShortVacationDate(
  dateString: string
): string {
  return parseLocalDate(dateString).toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
    }
  );
}

export function getSwedishDayName(
  dateString: string
): string {
  return parseLocalDate(dateString).toLocaleDateString(
    "sv-SE",
    {
      weekday: "long",
    }
  );
}

export function createMapsUrl(
  accommodation: string,
  location: string | null
): string {
  const query = location
    ? `${accommodation}, ${location}`
    : accommodation;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

export function hasVisibleVacationInformation(
  day: VacationDay
): boolean {
  return Boolean(
    day.location ||
      day.travel ||
      day.accommodation ||
      day.activity ||
      day.information
  );
}

export function formHasVacationInformation(
  form: VacationFieldsForm
): boolean {
  return Boolean(
    form.location.trim() ||
      form.travel.trim() ||
      form.accommodation.trim() ||
      form.activity.trim() ||
      form.information.trim()
  );
}

export function normalizeOptionalText(
  value: string
): string | null {
  const trimmedValue = value.trim();

  return trimmedValue || null;
}

export function createVacationEditForm(
  day: VacationDay
): VacationFieldsForm {
  return {
    location: day.location ?? "",
    travel: day.travel ?? "",
    accommodation: day.accommodation ?? "",
    activity: day.activity ?? "",
    information: day.information ?? "",
  };
}