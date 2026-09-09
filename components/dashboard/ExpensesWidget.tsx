"use client";

import {
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
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

type ExpenseGroup = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

type Expense = {
  id: string;
  item: string;
  price: number | string;
  created_at: string;
  group_id: string;
  paid_by: Payer | null;
};

function parsePrice(value: number | string): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
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

export default function ExpensesWidget() {
  const [groups, setGroups] = useState<ExpenseGroup[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [paidBy, setPaidBy] = useState<Payer>("Jens");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const [groupsResult, expensesResult] = await Promise.all([
      supabase
        .from("expense_groups")
        .select("id, name, sort_order, created_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("shopping_ledger")
        .select("id, item, price, created_at, group_id, paid_by")
        .order("created_at", { ascending: false }),
    ]);

    if (groupsResult.error || expensesResult.error) {
      console.error("Kunde inte hämta utgiftsdata:", {
        groups: groupsResult.error,
        expenses: expensesResult.error,
      });
      setErrorMessage("Kunde inte hämta utgifterna från databasen.");
      setIsLoading(false);
      return;
    }

    const loadedGroups = (groupsResult.data ?? []) as ExpenseGroup[];
    const loadedExpenses = (expensesResult.data ?? []) as Expense[];

    setGroups(loadedGroups);
    setExpenses(loadedExpenses);
    setActiveGroupId((current) => {
      if (current && loadedGroups.some((group) => group.id === current)) {
        return current;
      }
      return loadedGroups[0]?.id ?? null;
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const normalizedPrice = useMemo(
    () => priceInput.trim().replace(",", "."),
    [priceInput]
  );

  const parsedInputPrice = useMemo(() => {
    if (!normalizedPrice) return null;
    const value = Number(normalizedPrice);
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.round(value * 100) / 100;
  }, [normalizedPrice]);

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) ?? null,
    [groups, activeGroupId]
  );

  const activeExpenses = useMemo(
    () => expenses.filter((expense) => expense.group_id === activeGroupId),
    [expenses, activeGroupId]
  );

  const totals = useMemo(() => {
    return activeExpenses.reduce(
      (result, expense) => {
        const price = parsePrice(expense.price);
        result.total += price;
        if (expense.paid_by === "Jens") result.jens += price;
        if (expense.paid_by === "Lenita") result.lenita += price;
        if (expense.paid_by === "Gemensam") result.gemensam += price;
        if (!expense.paid_by) result.unassigned += price;
        return result;
      },
      { total: 0, jens: 0, lenita: 0, gemensam: 0, unassigned: 0 }
    );
  }, [activeExpenses]);

  const settlementText = useMemo(() => {
    if (totals.unassigned > 0 || totals.total <= 0) return null;

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
      return `Lenita betalar Jens ${formatCurrency(jensDifference)} för att jämna ut.`;
    }

    return `Jens betalar Lenita ${formatCurrency(Math.abs(jensDifference))} för att jämna ut.`;
  }, [totals]);

  const canSubmit =
    activeGroupId !== null &&
    itemName.trim().length > 0 &&
    parsedInputPrice !== null &&
    !isSaving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedItemName = itemName.trim();
    if (!trimmedItemName || parsedInputPrice === null || !activeGroupId || isSaving) {
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
      })
      .select("id, item, price, created_at, group_id, paid_by")
      .single();

    if (error) {
      console.error("Kunde inte lägga till utgiften:", error);
      setErrorMessage("Utgiften kunde inte läggas till.");
      setIsSaving(false);
      return;
    }

    setExpenses((current) => [data as Expense, ...current]);
    setItemName("");
    setPriceInput("");
    setIsSaving(false);
  }

  async function deleteExpense(id: string) {
    if (deletingId !== null) return;

    setDeletingId(id);
    setErrorMessage(null);

    const { error } = await supabase.from("shopping_ledger").delete().eq("id", id);

    if (error) {
      console.error("Kunde inte ta bort utgiften:", error);
      setErrorMessage("Utgiften kunde inte tas bort.");
      setDeletingId(null);
      return;
    }

    setExpenses((current) => current.filter((expense) => expense.id !== id));
    setDeletingId(null);
  }

  async function addGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newGroupName.trim();
    if (!name || isSavingGroup) return;

    setIsSavingGroup(true);
    setErrorMessage(null);

    const nextSortOrder =
      groups.length === 0 ? 0 : Math.max(...groups.map((group) => group.sort_order)) + 10;

    const { data, error } = await supabase
      .from("expense_groups")
      .insert({ name, sort_order: nextSortOrder })
      .select("id, name, sort_order, created_at")
      .single();

    if (error) {
      console.error("Kunde inte skapa utgiftsfliken:", error);
      setErrorMessage("Den nya fliken kunde inte skapas.");
      setIsSavingGroup(false);
      return;
    }

    const group = data as ExpenseGroup;
    setGroups((current) => [...current, group]);
    setActiveGroupId(group.id);
    setNewGroupName("");
    setIsAddingGroup(false);
    setIsSavingGroup(false);
  }

  function startEditingGroup(group: ExpenseGroup) {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  }

  async function saveGroupName(groupId: string) {
    const name = editingGroupName.trim();
    if (!name || isSavingGroup) return;

    setIsSavingGroup(true);
    setErrorMessage(null);

    const { error } = await supabase
      .from("expense_groups")
      .update({ name })
      .eq("id", groupId);

    if (error) {
      console.error("Kunde inte byta namn på fliken:", error);
      setErrorMessage("Flikens namn kunde inte ändras.");
      setIsSavingGroup(false);
      return;
    }

    setGroups((current) =>
      current.map((group) => (group.id === groupId ? { ...group, name } : group))
    );
    setEditingGroupId(null);
    setEditingGroupName("");
    setIsSavingGroup(false);
  }

  async function deleteGroup(group: ExpenseGroup) {
    if (groups.length <= 1 || deletingGroupId !== null) return;

    const confirmed = window.confirm(
      `Ta bort fliken “${group.name}”? Alla utgifter i fliken tas också bort.`
    );
    if (!confirmed) return;

    setDeletingGroupId(group.id);
    setErrorMessage(null);

    const { error } = await supabase.from("expense_groups").delete().eq("id", group.id);

    if (error) {
      console.error("Kunde inte ta bort fliken:", error);
      setErrorMessage("Fliken kunde inte tas bort.");
      setDeletingGroupId(null);
      return;
    }

    const remainingGroups = groups.filter((item) => item.id !== group.id);
    setGroups(remainingGroups);
    setExpenses((current) => current.filter((expense) => expense.group_id !== group.id));
    if (activeGroupId === group.id) {
      setActiveGroupId(remainingGroups[0]?.id ?? null);
    }
    setDeletingGroupId(null);
  }

  return (
    <Card title="Utgifter" icon={<WalletCards size={28} />}>
      <div className="mb-5">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {groups.map((group) => {
            const isActive = group.id === activeGroupId;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveGroupId(group.id)}
                className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-blue-400/40 bg-blue-400/15 text-blue-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {group.name}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsAddingGroup(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
          >
            <Plus size={16} /> Ny flik
          </button>
        </div>

        {isAddingGroup && (
          <form onSubmit={addGroup} className="mt-3 flex gap-2">
            <input
              autoFocus
              type="text"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="Till exempel Semester"
              maxLength={50}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
            />
            <button
              type="submit"
              disabled={!newGroupName.trim() || isSavingGroup}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-white disabled:opacity-40"
              aria-label="Skapa flik"
            >
              {isSavingGroup ? <LoaderCircle size={18} className="animate-spin" /> : <Check size={18} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingGroup(false);
                setNewGroupName("");
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300"
              aria-label="Avbryt"
            >
              <X size={18} />
            </button>
          </form>
        )}

        {activeGroup && (
          <div className="mt-2 flex min-h-9 items-center justify-end gap-1">
            {editingGroupId === activeGroup.id ? (
              <>
                <input
                  autoFocus
                  value={editingGroupName}
                  onChange={(event) => setEditingGroupName(event.target.value)}
                  maxLength={50}
                  className="w-full max-w-64 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-1.5 text-sm text-white outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => void saveGroupName(activeGroup.id)}
                  disabled={!editingGroupName.trim() || isSavingGroup}
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
                <button
                  type="button"
                  onClick={() => startEditingGroup(activeGroup)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <Pencil size={14} /> Byt namn
                </button>
                <button
                  type="button"
                  disabled={groups.length <= 1 || deletingGroupId !== null}
                  onClick={() => void deleteGroup(activeGroup)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-30"
                  title={groups.length <= 1 ? "Minst en flik måste finnas kvar" : "Ta bort flik"}
                >
                  {deletingGroupId === activeGroup.id ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Ta bort flik
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.5fr)_minmax(130px,180px)_minmax(330px,1fr)_auto]">
          <label className="min-w-0">
            <span className="mb-2 block text-sm font-medium text-slate-300">Utgift</span>
            <input
              type="text"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              placeholder="Till exempel middag"
              maxLength={100}
              autoComplete="off"
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            />
          </label>

          <label className="min-w-0">
            <span className="mb-2 block text-sm font-medium text-slate-300">Pris</span>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "" || /^\d*[.,]?\d{0,2}$/.test(value)) setPriceInput(value);
                }}
                placeholder="0,00"
                maxLength={12}
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-400">kr</span>
            </div>
          </label>

          <fieldset className="min-w-0">
            <legend className="mb-2 block text-sm font-medium text-slate-300">Betalat av</legend>
            <div className="grid grid-cols-3 gap-2 min-w-[330px]">
              {(["Jens", "Lenita", "Gemensam"] as Payer[]).map((payer) => (
                <button
                  key={payer}
                  type="button"
                  onClick={() => setPaidBy(payer)}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    paidBy === payer
                      ? "border-violet-400/40 bg-violet-400/15 text-violet-100"
                      : "border-white/10 bg-slate-950/40 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  <UserRound size={16} /> {payer}
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
              {isSaving ? <LoaderCircle size={19} className="animate-spin" /> : <Plus size={19} />}
              {isSaving ? "Sparar…" : "Lägg till"}
            </button>
          </div>
        </div>

        {priceInput.trim() && parsedInputPrice === null && (
          <p className="mt-3 text-sm text-amber-200">Ange ett giltigt pris som är större än 0 kr.</p>
        )}
      </form>

      {errorMessage && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-200">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
          >
            <RefreshCw size={16} /> Försök igen
          </button>
        </div>
      )}

      <div className="mt-5">
        {isLoading ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
            <LoaderCircle size={30} className="animate-spin text-blue-300" />
            <p className="text-sm text-slate-400">Hämtar utgifterna…</p>
          </div>
        ) : activeExpenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
            <ReceiptText size={36} className="mx-auto text-blue-300" />
            <p className="mt-3 font-semibold text-white">Inga utgifter i {activeGroup?.name ?? "den här fliken"}</p>
            <p className="mt-1 text-sm text-slate-400">Lägg till den första utgiften ovan.</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {activeExpenses.map((expense) => {
              const isDeleting = deletingId === expense.id;
              return (
                <li key={expense.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
                    <ReceiptText size={21} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-white">{expense.item}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span>{formatDate(expense.created_at)}</span>
                      <span>·</span>
                      <span className={expense.paid_by ? "text-violet-200/80" : "text-amber-200/80"}>
                        {expense.paid_by ? `Betalat av ${expense.paid_by}` : "Betalare ej angiven"}
                      </span>
                    </div>
                  </div>
                  <p className="shrink-0 text-right font-semibold text-white">{formatCurrency(parsePrice(expense.price))}</p>
                  <button
                    type="button"
                    disabled={deletingId !== null}
                    onClick={() => void deleteExpense(expense.id)}
                    aria-label={`Ta bort utgiften ${expense.item}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 text-red-200 transition hover:bg-red-400/20 disabled:cursor-wait disabled:opacity-50"
                  >
                    {isDeleting ? <LoaderCircle size={18} className="animate-spin" /> : <Trash2 size={18} />}
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
            <p className="text-sm font-medium text-emerald-200">Totalt · {activeGroup?.name ?? "Utgifter"}</p>
            <p className="mt-1 text-xs text-emerald-100/60">Summering för den valda fliken</p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{formatCurrency(totals.total)}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-black/10 p-3">
            <p className="text-xs text-emerald-100/60">Jens har betalat</p>
            <p className="mt-1 text-lg font-bold text-white">{formatCurrency(totals.jens)}</p>
          </div>
          <div className="rounded-xl bg-black/10 p-3">
            <p className="text-xs text-emerald-100/60">Lenita har betalat</p>
            <p className="mt-1 text-lg font-bold text-white">{formatCurrency(totals.lenita)}</p>
          </div>
          <div className="rounded-xl bg-black/10 p-3">
            <p className="text-xs text-emerald-100/60">Gemensamt betalat</p>
            <p className="mt-1 text-lg font-bold text-white">{formatCurrency(totals.gemensam)}</p>
          </div>
        </div>

        {totals.unassigned > 0 && (
          <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            {formatCurrency(totals.unassigned)} saknar angiven betalare. Utjämningen visas när alla poster har en betalare.
          </p>
        )}

        {settlementText && (
          <p className="mt-3 rounded-xl border border-violet-300/15 bg-violet-300/10 px-3 py-2 text-sm font-semibold text-violet-100">
            {settlementText}
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">Varje flik har sin egen utgiftslista och summering. Allt sparas i databasen.</p>
    </Card>
  );
}
