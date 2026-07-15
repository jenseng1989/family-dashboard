"use client";

import {
  Home,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import {
  FormEvent,
  Suspense,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const returnTo = searchParams.get("returnTo") || "/";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!password || isLoggingIn) {
      return;
    }

    setIsLoggingIn(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          returnTo,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        returnTo?: string;
      };

      if (!response.ok || !result.success) {
        setErrorMessage(
          result.error ?? "Inloggningen misslyckades."
        );
        setIsLoggingIn(false);
        return;
      }

      router.replace(result.returnTo || "/");
      router.refresh();
    } catch (error) {
      console.error("Inloggningsfel:", error);

      setErrorMessage(
        "Kunde inte kontakta servern. Försök igen."
      );
      setIsLoggingIn(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="pointer-events-none absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-3xl" />

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
            <Home size={32} />
          </div>

          <h1 className="mt-5 text-3xl font-bold">
            Family Dashboard
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Skriv in familjens lösenord för att öppna
            dashboarden.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-7"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              Lösenord
            </span>

            <div className="relative">
              <LockKeyhole
                size={19}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
                autoFocus
                placeholder="Skriv lösenordet"
                className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-3 pl-12 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
          </label>

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3">
              <p className="text-sm text-red-200">
                {errorMessage}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={!password || isLoggingIn}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoggingIn ? (
              <LoaderCircle
                size={19}
                className="animate-spin"
              />
            ) : (
              <LockKeyhole size={19} />
            )}

            {isLoggingIn
              ? "Loggar in…"
              : "Öppna dashboarden"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Inloggningen sparas på den här enheten i 30
          dagar.
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <LoaderCircle
            size={34}
            className="animate-spin text-blue-300"
          />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}