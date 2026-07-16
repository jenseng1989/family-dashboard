export type VacationDay = {
  id: string;
  plan_date: string;
  day_name: string | null;
  location: string | null;
  travel: string | null;
  accommodation: string | null;
  activity: string | null;
  information: string | null;
};

export type VacationField =
  | "location"
  | "travel"
  | "accommodation"
  | "activity"
  | "information";

export type VacationFieldsForm = {
  location: string;
  travel: string;
  accommodation: string;
  activity: string;
  information: string;
};

export type VacationAddFormData = VacationFieldsForm & {
  planDate: string;
};

export const EMPTY_VACATION_FIELDS_FORM: VacationFieldsForm = {
  location: "",
  travel: "",
  accommodation: "",
  activity: "",
  information: "",
};

export const EMPTY_VACATION_ADD_FORM: VacationAddFormData = {
  planDate: "",
  ...EMPTY_VACATION_FIELDS_FORM,
};