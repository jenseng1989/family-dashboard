"use client";

import {
  Check,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShoppingBasket,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type ShoppingItem = {
  id: string;
  name: string;
  created_at: string;
};

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("shopping_items")
      .select("id, name, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        "Kunde inte hämta inköpslistan:",
        error
      );

      setErrorMessage(
        "Kunde inte hämta inköpslistan från databasen."
      );
      setIsLoading(false);
      return;
    }

    setItems(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedName = itemName.trim();

    if (!trimmedName || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("shopping_items")
      .insert({
        name: trimmedName,
      })
      .select("id, name, created_at")
      .single();

    if (error) {
      console.error(
        "Kunde inte lägga till varan:",
        error
      );

      setErrorMessage("Varan kunde inte läggas till.");
      setIsSaving(false);
      return;
    }

    setItems((currentItems) => [
      ...currentItems,
      data,
    ]);

    setItemName("");
    setIsSaving(false);
  }

  async function completeItem(id: string) {
    if (deletingId) {
      return;
    }

    setDeletingId(id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("shopping_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Kunde inte ta bort varan:",
        error
      );

      setErrorMessage(
        "Varan kunde inte tas bort från listan."
      );
      setDeletingId(null);
      return;
    }

    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== id)
    );

    setDeletingId(null);
  }

  return (
    <Card
      title="Inköpslista"
      icon={<ShoppingBasket size={28} />}
    >
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/5 p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">
              Vara att lägga till
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

          <button
            type="submit"
            disabled={!itemName.trim() || isSaving}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? (
              <LoaderCircle
                size={19}
                className="animate-spin"
              />
            ) : (
              <Plus size={19} />
            )}

            {isSaving ? "Lägger till…" : "Lägg till"}
          </button>
        </div>
      </form>

      {errorMessage && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-200">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => void loadItems()}
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
              Hämtar inköpslistan…
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
            <ShoppingBasket
              size={36}
              className="mx-auto text-blue-300"
            />

            <p className="mt-3 font-semibold text-white">
              Inköpslistan är tom
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Lägg till något som behöver handlas.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => {
              const isDeleting =
                deletingId === item.id;

              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10"
                >
                  <label className="flex cursor-pointer items-center gap-4 p-4">
                    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isDeleting}
                        disabled={deletingId !== null}
                        onChange={() =>
                          void completeItem(item.id)
                        }
                        aria-label={`Markera ${item.name} som köpt`}
                        className="peer h-7 w-7 cursor-pointer appearance-none rounded-lg border-2 border-slate-500 bg-slate-950/40 transition checked:border-emerald-400 checked:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
                      />

                      {isDeleting ? (
                        <LoaderCircle
                          size={17}
                          className="pointer-events-none absolute animate-spin text-white"
                        />
                      ) : (
                        <Check
                          size={17}
                          className="pointer-events-none absolute scale-0 text-white transition peer-checked:scale-100"
                        />
                      )}
                    </span>

                    <span className="min-w-0 flex-1 break-words text-base font-medium text-white">
                      {item.name}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Bocka i en vara när den är köpt. Då tas den
        automatiskt bort från listan.
      </p>
    </Card>
  );
}