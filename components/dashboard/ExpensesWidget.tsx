"use client";

import {
  Archive,
  ArchiveRestore,
  BarChart3,
  Check,
  ChevronDown,
  LoaderCircle,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Tags,
  Trash2,
  UserRound,
  WalletCards,
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

type Payer = "Jens" | "Lenita" | "Gemensam";
type GroupType = "simple" | "advanced";
type ExpenseCategory =
  | "Mat"
  | "Boende"
  | "Transport"
  | "Aktivitet"
  | "Shopping"
  | "Övrigt";

const CATEGORIES: ExpenseCategory[] = [
  "Mat",
  "Boende",
  "Transport",
  "Aktivitet",
  "Shopping",
  "Övrigt",
];

type ExpenseGroup = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  group_type: GroupType;
  is_archived: boolean;
  archived_at: string | null;
};

type Expense = {
  id: string;
  item: string;
  price: number | string;
  created_at: string;
  group_id: string;
  paid_by: Payer | null;
  category: ExpenseCategory | null;
};

type EditingExpense = {
  id: string;
  item: string;
  price: string;
  paidBy: Payer;
  category: ExpenseCategory;
};

function parsePrice(value: number | string): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function parsePriceInput(value: string): number | null {
  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getCategoryEmoji(category: ExpenseCategory): string {
  switch (category) {
    case "Mat":
      return "🍴";
    case "Boende":
      return "🏨";
    case "Transport":
      return "🚆";
    case "Aktivitet":
      return "🎟️";
    case "Shopping":
      return "🛍️";
    case "Övrigt":
      return "📦";
  }
}

export default function ExpensesWidget() {
  const [groups, setGroups] = useState<ExpenseGroup[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    null
  );

  const [itemName, setItemName] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [paidBy, setPaidBy] = useState<Payer>("Jens");
  const [category, setCategory] =
    useState<ExpenseCategory>("Övrigt");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupType, setNewGroupType] =
    useState<GroupType>("simple");
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const [editingGroupId, setEditingGroupId] = useState<
    string | null
  >(null);
  const [editingGroupName, setEditingGroupName] = useState("");

  const [archivingGroupId, setArchivingGroupId] = useState<
    string | null
  >(null);
  const [deletingGroupId, setDeletingGroupId] = useState<
    string | null
  >(null);

  const [editingExpense, setEditingExpense] =
    useState<EditingExpense | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [showArchive, setShowArchive] = useState(false);

  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const [groupsResult, expensesResult] = await Promise.all([
      supabase
        .from("expense_groups")
        .select(
          "id, name, sort_order, created_at, group_type, is_archived, archived_at"
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("shopping_ledger")
        .select(
          "id, item, price, created_at, group_id, paid_by, category"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (groupsResult.error || expensesResult.error) {
      console.error("Kunde inte hämta utgiftsdata:", {
        groups: groupsResult.error,
        expenses: expensesResult.error,
      });

      setErrorMessage(
        "Kunde inte hämta utgifterna från databasen."
      );
      setIsLoading(false);
      return;
    }

    const loadedGroups = (groupsResult.data ??
      []) as ExpenseGroup[];
    const loadedExpenses = (expensesResult.data ??
      []) as Expense[];

    setGroups(loadedGroups);
    setExpenses(loadedExpenses);

    setActiveGroupId((current) => {
      if (
        current &&
        loadedGroups.some(
          (group) =>
            group.id === current && !group.is_archived
        )
      ) {
        return current;
      }

      return (
        loadedGroups.find((group) => !group.is_archived)?.id ??
        null
      );
    });

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeGroups = useMemo(
    () => groups.filter((group) => !group.is_archived),
    [groups]
  );

  const archivedGroups = useMemo(
    () => groups.filter((group) => group.is_archived),
    [groups]
  );

  const activeGroup = useMemo(
    () =>
      groups.find((group) => group.id === activeGroupId) ??
      null,
    [groups, activeGroupId]
  );

  const activeExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) => expense.group_id === activeGroupId
      ),
    [expenses, activeGroupId]
  );

  const parsedInputPrice = useMemo(
    () => parsePriceInput(priceInput),
    [priceInput]
  );

  const totals = useMemo(() => {
    return activeExpenses.reduce(
      (result, expense) => {
        const price = parsePrice(expense.price);

        result.total += price;

        if (expense.paid_by === "Jens") {
          result.jens += price;
        }

        if (expense.paid_by === "Lenita") {
          result.lenita += price;
        }

        if (expense.paid_by === "Gemensam") {
          result.gemensam += price;
        }

        if (!expense.paid_by) {
          result.unassigned += price;
        }

        return result;
      },
      {
        total: 0,
        jens: 0,
        lenita: 0,
        gemensam: 0,
        unassigned: 0,
      }
    );
  }, [activeExpenses]);

  const settlementText = useMemo(() => {
    if (totals.unassigned > 0 || totals.total <= 0) {
      return null;
    }

    const personalTotal = totals.jens + totals.lenita;

    if (personalTotal <= 0) {
      return null;
    }

    const fairShare = personalTotal / 2;
    const jensDifference = totals.jens - fairShare;

    if (Math.abs(jensDifference) < 0.005) {
      return "Ni har betalat lika mycket.";
    }

    if (jensDifference > 0) {
      return `Lenita betalar Jens ${formatCurrency(
        jensDifference
      )} för att jämna ut.`;
    }

    return `Jens betalar Lenita ${formatCurrency(
      Math.abs(jensDifference)
    )} för att jämna ut.`;
  }, [totals]);

  const categorySummary = useMemo(() => {
    if (activeGroup?.group_type !== "advanced") {
      return [];
    }

    return CATEGORIES.map((currentCategory) => {
      const sum = activeExpenses.reduce((total, expense) => {
        if (expense.category !== currentCategory) {
          return total;
        }

        return total + parsePrice(expense.price);
      }, 0);

      return {
        category: currentCategory,
        sum,
        percentage:
          totals.total > 0 ? (sum / totals.total) * 100 : 0,
      };
    })
      .filter((item) => item.sum > 0)
      .sort((a, b) => b.sum - a.sum);
  }, [activeExpenses, activeGroup, totals.total]);

  const canSubmit =
    activeGroupId !== null &&
    itemName.trim().length > 0 &&
    parsedInputPrice !== null &&
    !isSaving;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedItemName = itemName.trim();

    if (
      !trimmedItemName ||
      parsedInputPrice === null ||
      !activeGroupId ||
      isSaving
    ) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("shopping_ledger")
      .insert({
        item: trimmedItemName,
        price: parsedInputPrice,
        group_id: activeGroupId,
        paid_by: paidBy,
        category:
          activeGroup?.group_type === "advanced"
            ? category
            : null,
      })
      .select(
        "id, item, price, created_at, group_id, paid_by, category"
      )
      .single();

    if (error) {
      console.error(
        "Kunde inte lägga till utgiften:",
        error
      );
      setErrorMessage(
        "Utgiften kunde inte läggas till."
      );
      setIsSaving(false);
      return;
    }

    setExpenses((current) => [
      data as Expense,
      ...current,
    ]);
    setItemName("");
    setPriceInput("");
    setIsSaving(false);
  }

  async function deleteExpense(id: string) {
    if (deletingId !== null) {
      return;
    }

    setDeletingId(id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("shopping_ledger")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Kunde inte ta bort utgiften:",
        error
      );
      setErrorMessage(
        "Utgiften kunde inte tas bort."
      );
      setDeletingId(null);
      return;
    }

    setExpenses((current) =>
      current.filter((expense) => expense.id !== id)
    );
    setDeletingId(null);
  }

  function startEditingExpense(expense: Expense) {
    setEditingExpense({
      id: expense.id,
      item: expense.item,
      price: parsePrice(expense.price).toFixed(2).replace(".", ","),
      paidBy: expense.paid_by ?? "Jens",
      category: expense.category ?? "Övrigt",
    });
  }

  async function saveExpenseEdit() {
    if (!editingExpense || isSavingEdit) {
      return;
    }

    const item = editingExpense.item.trim();
    const price = parsePriceInput(editingExpense.price);

    if (!item || price === null) {
      return;
    }

    setIsSavingEdit(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("shopping_ledger")
      .update({
        item,
        price,
        paid_by: editingExpense.paidBy,
        category:
          activeGroup?.group_type === "advanced"
            ? editingExpense.category
            : null,
      })
      .eq("id", editingExpense.id)
      .select(
        "id, item, price, created_at, group_id, paid_by, category"
      )
      .single();

    if (error) {
      console.error(
        "Kunde inte uppdatera utgiften:",
        error
      );
      setErrorMessage(
        "Utgiften kunde inte uppdateras."
      );
      setIsSavingEdit(false);
      return;
    }

    setExpenses((current) =>
      current.map((expense) =>
        expense.id === editingExpense.id
          ? (data as Expense)
          : expense
      )
    );

    setEditingExpense(null);
    setIsSavingEdit(false);
  }

  async function addGroup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name = newGroupName.trim();

    if (!name || isSavingGroup) {
      return;
    }

    setIsSavingGroup(true);
    setErrorMessage(null);

    const nextSortOrder =
      groups.length === 0
        ? 0
        : Math.max(
            ...groups.map((group) => group.sort_order)
          ) + 10;

    const { data, error } = await supabase
      .from("expense_groups")
      .insert({
        name,
        sort_order: nextSortOrder,
        group_type: newGroupType,
        is_archived: false,
      })
      .select(
        "id, name, sort_order, created_at, group_type, is_archived, archived_at"
      )
      .single();

    if (error) {
      console.error(
        "Kunde inte skapa utgiftsfliken:",
        error
      );
      setErrorMessage(
        "Den nya fliken kunde inte skapas."
      );
      setIsSavingGroup(false);
      return;
    }

    const group = data as ExpenseGroup;

    setGroups((current) => [...current, group]);
    setActiveGroupId(group.id);
    setNewGroupName("");
    setNewGroupType("simple");
    setIsAddingGroup(false);
    setIsSavingGroup(false);
  }

  function startEditingGroup(group: ExpenseGroup) {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  }

  async function saveGroupName(groupId: string) {
    const name = editingGroupName.trim();

    if (!name || isSavingGroup) {
      return;
    }

    setIsSavingGroup(true);
    setErrorMessage(null);

    const { error } = await supabase
      .from("expense_groups")
      .update({ name })
      .eq("id", groupId);

    if (error) {
      console.error(
        "Kunde inte byta namn på fliken:",
        error
      );
      setErrorMessage(
        "Flikens namn kunde inte ändras."
      );
      setIsSavingGroup(false);
      return;
    }

    setGroups((current) =>
      current.map((group) =>
        group.id === groupId ? { ...group, name } : group
      )
    );

    setEditingGroupId(null);
    setEditingGroupName("");
    setIsSavingGroup(false);
  }

  async function upgradeGroup(group: ExpenseGroup) {
    if (
      group.group_type === "advanced" ||
      isSavingGroup
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Göra “${group.name}” till en avancerad utgiftsflik? Befintliga poster får kategorin Övrigt.`
    );

    if (!confirmed) {
      return;
    }

    setIsSavingGroup(true);
    setErrorMessage(null);

    const { error: expensesError } = await supabase
      .from("shopping_ledger")
      .update({ category: "Övrigt" })
      .eq("group_id", group.id)
      .is("category", null);

    if (expensesError) {
      console.error(
        "Kunde inte kategorisera befintliga utgifter:",
        expensesError
      );
      setErrorMessage(
        "Fliken kunde inte uppgraderas."
      );
      setIsSavingGroup(false);
      return;
    }

    const { error: groupError } = await supabase
      .from("expense_groups")
      .update({ group_type: "advanced" })
      .eq("id", group.id);

    if (groupError) {
      console.error(
        "Kunde inte uppgradera fliken:",
        groupError
      );
      setErrorMessage(
        "Fliken kunde inte uppgraderas."
      );
      setIsSavingGroup(false);
      return;
    }

    setGroups((current) =>
      current.map((item) =>
        item.id === group.id
          ? { ...item, group_type: "advanced" }
          : item
      )
    );

    setExpenses((current) =>
      current.map((expense) =>
        expense.group_id === group.id &&
        expense.category === null
          ? { ...expense, category: "Övrigt" }
          : expense
      )
    );

    setCategory("Övrigt");
    setIsSavingGroup(false);
  }

  async function archiveGroup(group: ExpenseGroup) {
    if (archivingGroupId !== null) {
      return;
    }

    setArchivingGroupId(group.id);
    setErrorMessage(null);

    const archivedAt = new Date().toISOString();

    const { error } = await supabase
      .from("expense_groups")
      .update({
        is_archived: true,
        archived_at: archivedAt,
      })
      .eq("id", group.id);

    if (error) {
      console.error(
        "Kunde inte arkivera fliken:",
        error
      );
      setErrorMessage(
        "Fliken kunde inte arkiveras."
      );
      setArchivingGroupId(null);
      return;
    }

    const remaining = activeGroups.filter(
      (item) => item.id !== group.id
    );

    setGroups((current) =>
      current.map((item) =>
        item.id === group.id
          ? {
              ...item,
              is_archived: true,
              archived_at: archivedAt,
            }
          : item
      )
    );

    if (activeGroupId === group.id) {
      setActiveGroupId(remaining[0]?.id ?? null);
    }

    setArchivingGroupId(null);
  }

  async function restoreGroup(group: ExpenseGroup) {
    if (archivingGroupId !== null) {
      return;
    }

    setArchivingGroupId(group.id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("expense_groups")
      .update({
        is_archived: false,
        archived_at: null,
      })
      .eq("id", group.id);

    if (error) {
      console.error(
        "Kunde inte återställa fliken:",
        error
      );
      setErrorMessage(
        "Fliken kunde inte återställas."
      );
      setArchivingGroupId(null);
      return;
    }

    setGroups((current) =>
      current.map((item) =>
        item.id === group.id
          ? {
              ...item,
              is_archived: false,
              archived_at: null,
            }
          : item
      )
    );

    setActiveGroupId(group.id);
    setShowArchive(false);
    setArchivingGroupId(null);
  }

  async function deleteGroupPermanently(
    group: ExpenseGroup
  ) {
    if (deletingGroupId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Ta bort “${group.name}” permanent? Alla utgifter i fliken tas också bort. Detta går inte att ångra.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingGroupId(group.id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("expense_groups")
      .delete()
      .eq("id", group.id);

    if (error) {
      console.error(
        "Kunde inte ta bort fliken:",
        error
      );
      setErrorMessage(
        "Fliken kunde inte tas bort."
      );
      setDeletingGroupId(null);
      return;
    }

    setGroups((current) =>
      current.filter((item) => item.id !== group.id)
    );
    setExpenses((current) =>
      current.filter(
        (expense) => expense.group_id !== group.id
      )
    );

    if (activeGroupId === group.id) {
      setActiveGroupId(activeGroups[0]?.id ?? null);
    }

    setDeletingGroupId(null);
  }

  return (
    <Card
      title="Utgifter"
      icon={<WalletCards size={28} />}
    >
      <div className="mb-5">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {activeGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                setActiveGroupId(group.id);
                setEditingExpense(null);
              }}
              className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                activeGroupId === group.id
                  ? "border-blue-400/40 bg-blue-400/15 text-blue-100"
                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {group.name}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setIsAddingGroup(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-white/15 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-blue-400/30 hover:bg-blue-400/10 hover:text-blue-100"
          >
            <Plus size={16} />
            Ny flik
          </button>

          <button
            type="button"
            onClick={() => setShowArchive((current) => !current)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              showArchive
                ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Archive size={16} />
            Arkiv ({archivedGroups.length})
          </button>
        </div>

        {isAddingGroup && (
          <form
            onSubmit={addGroup}
            className="mt-3 rounded-2xl border border-blue-400/20 bg-blue-400/5 p-4"
          >
            <p className="text-sm font-semibold text-white">
              Skapa utgiftsflik
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                type="text"
                value={newGroupName}
                onChange={(event) =>
                  setNewGroupName(event.target.value)
                }
                placeholder="Till exempel Färöarna 2027"
                maxLength={60}
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={
                    !newGroupName.trim() || isSavingGroup
                  }
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:opacity-40"
                >
                  {isSavingGroup ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Check size={18} />
                  )}
                  Skapa
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddingGroup(false);
                    setNewGroupName("");
                    setNewGroupType("simple");
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Avbryt"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setNewGroupType("simple")}
                className={`rounded-xl border p-3 text-left transition ${
                  newGroupType === "simple"
                    ? "border-emerald-400/40 bg-emerald-400/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/5"
                }`}
              >
                <p className="font-semibold text-white">
                  Enkel
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Utgift, pris och vem som betalade.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setNewGroupType("advanced")}
                className={`rounded-xl border p-3 text-left transition ${
                  newGroupType === "advanced"
                    ? "border-violet-400/40 bg-violet-400/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/5"
                }`}
              >
                <p className="flex items-center gap-2 font-semibold text-white">
                  <Tags size={16} />
                  Avancerad
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Samma funktioner plus kategorier och
                  kategorisammanfattning.
                </p>
              </button>
            </div>
          </form>
        )}

        {showArchive && (
          <div className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/5 p-4">
            <div className="flex items-center gap-2">
              <Archive size={18} className="text-amber-200" />
              <p className="font-semibold text-white">
                Arkiverade utgiftsflikar
              </p>
            </div>

            {archivedGroups.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                Det finns inga arkiverade flikar ännu.
              </p>
            ) : (
              <div className="mt-3 grid gap-2">
                {archivedGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {group.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {group.group_type === "advanced"
                          ? "Avancerad"
                          : "Enkel"}
                        {group.archived_at
                          ? ` · Arkiverad ${formatDate(
                              group.archived_at
                            )}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={archivingGroupId !== null}
                        onClick={() => void restoreGroup(group)}
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-40"
                      >
                        {archivingGroupId === group.id ? (
                          <LoaderCircle
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <ArchiveRestore size={14} />
                        )}
                        Återställ
                      </button>

                      <button
                        type="button"
                        disabled={deletingGroupId !== null}
                        onClick={() =>
                          void deleteGroupPermanently(group)
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-red-300/15 bg-red-300/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-300/15 disabled:opacity-40"
                      >
                        {deletingGroupId === group.id ? (
                          <LoaderCircle
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Ta bort
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeGroup && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {editingGroupId === activeGroup.id ? (
              <>
                <input
                  type="text"
                  value={editingGroupName}
                  onChange={(event) =>
                    setEditingGroupName(event.target.value)
                  }
                  maxLength={60}
                  className="w-full max-w-64 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-1.5 text-sm text-white outline-none focus:border-blue-400"
                />

                <button
                  type="button"
                  onClick={() =>
                    void saveGroupName(activeGroup.id)
                  }
                  disabled={
                    !editingGroupName.trim() || isSavingGroup
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-200 hover:bg-emerald-400/10 disabled:opacity-40"
                  aria-label="Spara fliknamn"
                >
                  <Check size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setEditingGroupId(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10"
                  aria-label="Avbryt namnbyte"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    activeGroup.group_type === "advanced"
                      ? "bg-violet-400/10 text-violet-200"
                      : "bg-emerald-400/10 text-emerald-200"
                  }`}
                >
                  {activeGroup.group_type === "advanced"
                    ? "Avancerad"
                    : "Enkel"}
                </span>

                <button
                  type="button"
                  onClick={() => startEditingGroup(activeGroup)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <Pencil size={14} />
                  Byt namn
                </button>

                {activeGroup.group_type === "simple" && (
                  <button
                    type="button"
                    disabled={isSavingGroup}
                    onClick={() =>
                      void upgradeGroup(activeGroup)
                    }
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-violet-300 transition hover:bg-violet-400/10"
                  >
                    <Tags size={14} />
                    Gör avancerad
                  </button>
                )}

                <button
                  type="button"
                  disabled={archivingGroupId !== null}
                  onClick={() => void archiveGroup(activeGroup)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-300/10 disabled:opacity-40"
                >
                  {archivingGroupId === activeGroup.id ? (
                    <LoaderCircle
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <Archive size={14} />
                  )}
                  Arkivera
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {activeGroup ? (
        <>
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div
              className={`grid gap-3 ${
                activeGroup.group_type === "advanced"
                  ? "xl:grid-cols-[minmax(0,0.55fr)_minmax(120px,160px)_minmax(150px,190px)_minmax(310px,1fr)_auto]"
                  : "lg:grid-cols-[minmax(0,0.5fr)_minmax(130px,180px)_minmax(330px,1fr)_auto]"
              }`}
            >
              <label className="min-w-0">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Utgift
                </span>

                <input
                  type="text"
                  value={itemName}
                  onChange={(event) =>
                    setItemName(event.target.value)
                  }
                  placeholder="Till exempel middag"
                  maxLength={100}
                  autoComplete="off"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                />
              </label>

              <label className="min-w-0">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Pris
                </span>

                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={priceInput}
                    onChange={(event) => {
                      const value = event.target.value;

                      if (
                        value === "" ||
                        /^\d*[.,]?\d{0,2}$/.test(value)
                      ) {
                        setPriceInput(value);
                      }
                    }}
                    placeholder="0,00"
                    maxLength={12}
                    autoComplete="off"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                  />

                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-400">
                    kr
                  </span>
                </div>
              </label>

              {activeGroup.group_type === "advanced" && (
                <label className="min-w-0">
                  <span className="mb-2 block text-sm font-medium text-slate-300">
                    Kategori
                  </span>

                  <div className="relative">
                    <select
                      value={category}
                      onChange={(event) =>
                        setCategory(
                          event.target.value as ExpenseCategory
                        )
                      }
                      className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 pr-10 text-white outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                    >
                      {CATEGORIES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={17}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                  </div>
                </label>
              )}

              <fieldset className="min-w-0">
                <legend className="mb-2 block text-sm font-medium text-slate-300">
                  Betalat av
                </legend>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    ["Jens", "Lenita", "Gemensam"] as Payer[]
                  ).map((payer) => (
                    <button
                      key={payer}
                      type="button"
                      onClick={() => setPaidBy(payer)}
                      className={`flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-xl border px-2 py-3 text-sm font-semibold transition sm:gap-2 sm:px-3 ${
                        paidBy === payer
                          ? "border-violet-400/40 bg-violet-400/15 text-violet-100"
                          : "border-white/10 bg-slate-950/40 text-slate-400 hover:bg-white/5"
                      }`}
                    >
                      <UserRound
                        size={16}
                        className="hidden shrink-0 sm:block"
                      />
                      <span className="truncate">
                        {payer}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto"
                >
                  {isSaving ? (
                    <LoaderCircle
                      size={19}
                      className="animate-spin"
                    />
                  ) : (
                    <Plus size={19} />
                  )}

                  {isSaving ? "Sparar…" : "Lägg till"}
                </button>
              </div>
            </div>

            {priceInput.trim() &&
              parsedInputPrice === null && (
                <p className="mt-3 text-sm text-amber-200">
                  Ange ett giltigt pris som är större än
                  0 kr.
                </p>
              )}
          </form>

          {errorMessage && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-red-200">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() => void loadData()}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
              >
                <RefreshCw size={16} />
                Försök igen
              </button>
            </div>
          )}

          <div className="mt-5">
            {isLoading ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
                <LoaderCircle
                  size={30}
                  className="animate-spin text-blue-300"
                />
                <p className="text-sm text-slate-400">
                  Hämtar utgifterna…
                </p>
              </div>
            ) : activeExpenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
                <ReceiptText
                  size={36}
                  className="mx-auto text-blue-300"
                />
                <p className="mt-3 font-semibold text-white">
                  Inga utgifter i {activeGroup.name}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Lägg till den första utgiften ovan.
                </p>
              </div>
            ) : (
              <ul className="grid gap-3">
                {activeExpenses.map((expense) => {
                  const isDeleting =
                    deletingId === expense.id;
                  const isEditing =
                    editingExpense?.id === expense.id;

                  if (isEditing && editingExpense) {
                    return (
                      <li
                        key={expense.id}
                        className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-4"
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px]">
                          <input
                            type="text"
                            value={editingExpense.item}
                            onChange={(event) =>
                              setEditingExpense({
                                ...editingExpense,
                                item: event.target.value,
                              })
                            }
                            maxLength={100}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-blue-400"
                          />

                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editingExpense.price}
                              onChange={(event) => {
                                const value =
                                  event.target.value;

                                if (
                                  value === "" ||
                                  /^\d*[.,]?\d{0,2}$/.test(
                                    value
                                  )
                                ) {
                                  setEditingExpense({
                                    ...editingExpense,
                                    price: value,
                                  });
                                }
                              }}
                              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 pr-10 text-white outline-none focus:border-blue-400"
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
                              kr
                            </span>
                          </div>
                        </div>

                        {activeGroup.group_type ===
                          "advanced" && (
                          <div className="mt-3">
                            <select
                              value={
                                editingExpense.category
                              }
                              onChange={(event) =>
                                setEditingExpense({
                                  ...editingExpense,
                                  category:
                                    event.target
                                      .value as ExpenseCategory,
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none focus:border-violet-400 sm:max-w-xs"
                            >
                              {CATEGORIES.map((item) => (
                                <option
                                  key={item}
                                  value={item}
                                >
                                  {item}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-3 gap-2 sm:max-w-lg">
                          {(
                            [
                              "Jens",
                              "Lenita",
                              "Gemensam",
                            ] as Payer[]
                          ).map((payer) => (
                            <button
                              key={payer}
                              type="button"
                              onClick={() =>
                                setEditingExpense({
                                  ...editingExpense,
                                  paidBy: payer,
                                })
                              }
                              className={`min-w-0 rounded-xl border px-2 py-2 text-sm font-semibold transition ${
                                editingExpense.paidBy ===
                                payer
                                  ? "border-violet-400/40 bg-violet-400/15 text-violet-100"
                                  : "border-white/10 bg-slate-950/40 text-slate-400"
                              }`}
                            >
                              <span className="truncate">
                                {payer}
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void saveExpenseEdit()
                            }
                            disabled={
                              isSavingEdit ||
                              !editingExpense.item.trim() ||
                              parsePriceInput(
                                editingExpense.price
                              ) === null
                            }
                            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-40"
                          >
                            {isSavingEdit ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Check size={16} />
                            )}
                            Spara
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingExpense(null)
                            }
                            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
                          >
                            <X size={16} />
                            Avbryt
                          </button>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li
                      key={expense.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
                        <ReceiptText size={21} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words font-medium text-white">
                          {expense.item}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          <span>
                            {formatDate(expense.created_at)}
                          </span>
                          <span>·</span>
                          <span
                            className={
                              expense.paid_by
                                ? "text-violet-200/80"
                                : "text-amber-200/80"
                            }
                          >
                            {expense.paid_by
                              ? `Betalat av ${expense.paid_by}`
                              : "Betalare ej angiven"}
                          </span>

                          {activeGroup.group_type ===
                            "advanced" &&
                            expense.category && (
                              <>
                                <span>·</span>
                                <span className="text-emerald-200/80">
                                  {getCategoryEmoji(
                                    expense.category
                                  )}{" "}
                                  {expense.category}
                                </span>
                              </>
                            )}
                        </div>
                      </div>

                      <p className="shrink-0 text-right font-semibold text-white">
                        {formatCurrency(
                          parsePrice(expense.price)
                        )}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          startEditingExpense(expense)
                        }
                        aria-label={`Redigera utgiften ${expense.item}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/10 text-blue-200 transition hover:bg-blue-400/20"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        type="button"
                        disabled={deletingId !== null}
                        onClick={() =>
                          void deleteExpense(expense.id)
                        }
                        aria-label={`Ta bort utgiften ${expense.item}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 text-red-200 transition hover:bg-red-400/20 disabled:cursor-wait disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <LoaderCircle
                            size={18}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
            <div className="flex items-end justify-between gap-4 border-b border-emerald-200/10 pb-4">
              <div>
                <p className="text-sm font-medium text-emerald-200">
                  Totalt · {activeGroup.name}
                </p>
                <p className="mt-1 text-xs text-emerald-100/60">
                  Summering för den valda fliken
                </p>
              </div>

              <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {formatCurrency(totals.total)}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-black/10 p-3">
                <p className="text-xs text-emerald-100/60">
                  Jens har betalat
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {formatCurrency(totals.jens)}
                </p>
              </div>

              <div className="rounded-xl bg-black/10 p-3">
                <p className="text-xs text-emerald-100/60">
                  Lenita har betalat
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {formatCurrency(totals.lenita)}
                </p>
              </div>

              <div className="rounded-xl bg-black/10 p-3">
                <p className="text-xs text-emerald-100/60">
                  Gemensamt betalat
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {formatCurrency(totals.gemensam)}
                </p>
              </div>
            </div>

            {totals.unassigned > 0 && (
              <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                {formatCurrency(totals.unassigned)} saknar
                angiven betalare. Utjämningen visas när
                alla poster har en betalare.
              </p>
            )}

            {settlementText && (
              <p className="mt-3 rounded-xl border border-violet-300/15 bg-violet-300/10 px-3 py-2 text-sm font-semibold text-violet-100">
                {settlementText}
              </p>
            )}
          </div>

          {activeGroup.group_type === "advanced" && (
            <div className="mt-4 rounded-2xl border border-violet-300/15 bg-violet-300/5 p-5">
              <div className="flex items-center gap-2">
                <BarChart3
                  size={20}
                  className="text-violet-200"
                />
                <div>
                  <p className="font-semibold text-white">
                    Fördelning per kategori
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Sammanfattning av {activeGroup.name}
                  </p>
                </div>
              </div>

              {categorySummary.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">
                  Lägg till en utgift för att se
                  kategorifördelningen.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {categorySummary.map((item) => (
                    <div
                      key={item.category}
                      className="rounded-xl border border-white/10 bg-black/10 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">
                          {getCategoryEmoji(item.category)}{" "}
                          {item.category}
                        </p>

                        <p className="text-sm font-semibold text-white">
                          {formatCurrency(item.sum)}
                        </p>
                      </div>

                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-violet-300/70"
                            style={{
                              width: `${Math.min(
                                100,
                                item.percentage
                              )}%`,
                            }}
                          />
                        </div>

                        <span className="w-11 shrink-0 text-right text-xs font-semibold text-violet-200">
                          {Math.round(item.percentage)} %
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Varje flik har sin egen utgiftslista och
            summering. Avslutade flikar kan arkiveras och
            återställas senare.
          </p>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
          <Archive size={36} className="mx-auto text-blue-300" />
          <p className="mt-3 font-semibold text-white">
            Ingen aktiv utgiftsflik
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Skapa en ny flik eller återställ en från arkivet.
          </p>
        </div>
      )}
    </Card>
  );
}
