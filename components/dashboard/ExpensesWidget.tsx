"use client";

import {
  LoaderCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  Trash2,
  WalletCards,
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

type Expense = {
  id: string;
  item: string;
  price: number | string;
  created_at: string;
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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [itemName, setItemName] = useState("");
  const [priceInput, setPriceInput] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("shopping_ledger")
      .select("id, item, price, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Kunde inte hämta utgifterna:",
        error
      );

      setErrorMessage(
        "Kunde inte hämta utgifterna från databasen."
      );
      setIsLoading(false);
      return;
    }

    setExpenses(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const normalizedPrice = useMemo(() => {
    return priceInput.trim().replace(",", ".");
  }, [priceInput]);

  const parsedInputPrice = useMemo(() => {
    if (!normalizedPrice) {
      return null;
    }

    const value = Number(normalizedPrice);

    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }

    return Math.round(value * 100) / 100;
  }, [normalizedPrice]);

  const totalPrice = useMemo(() => {
    return expenses.reduce(
      (total, expense) =>
        total + parsePrice(expense.price),
      0
    );
  }, [expenses]);

  const canSubmit =
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
      })
      .select("id, item, price, created_at")
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

    setExpenses((currentExpenses) => [
      data,
      ...currentExpenses,
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

    setExpenses((currentExpenses) =>
      currentExpenses.filter(
        (expense) => expense.id !== id
      )
    );

    setDeletingId(null);
  }

  return (
    <Card
      title="Utgifter"
      icon={<WalletCards size={28} />}
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/5 p-4"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(150px,220px)_auto]">
          <label className="min-w-0">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Artikel
            </span>

            <input
              type="text"
              value={itemName}
              onChange={(event) =>
                setItemName(event.target.value)
              }
              placeholder="Till exempel mjölk"
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
                aria-label="Pris i kronor"
                className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />

              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-400">
                kr
              </span>
            </div>
          </label>

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

              {isSaving
                ? "Sparar…"
                : "Lägg till utgift"}
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
            onClick={() => void loadExpenses()}
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
        ) : expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
            <ReceiptText
              size={36}
              className="mx-auto text-blue-300"
            />

            <p className="mt-3 font-semibold text-white">
              Inga utgifter registrerade
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Lägg till den första utgiften ovan.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {expenses.map((expense) => {
              const isDeleting =
                deletingId === expense.id;

              return (
                <li
                  key={expense.id}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
                    <ReceiptText size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-white">
                      {expense.item}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(
                        expense.created_at
                      )}
                    </p>
                  </div>

                  <p className="shrink-0 text-right font-semibold text-white">
                    {formatCurrency(
                      parsePrice(expense.price)
                    )}
                  </p>

                  <button
                    type="button"
                    disabled={deletingId !== null}
                    onClick={() =>
                      void deleteExpense(expense.id)
                    }
                    aria-label={`Ta bort utgiften ${expense.item}`}
                    title="Ta bort utgift"
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-200">
              Totala utgifter
            </p>

            <p className="mt-1 text-xs text-emerald-100/60">
              Summering av alla registrerade poster
            </p>
          </div>

          <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {formatCurrency(totalPrice)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Alla utgifter sparas i databasen och finns
        kvar när sidan öppnas igen.
      </p>
    </Card>
  );
}