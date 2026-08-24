export default function Header() {
  const date = new Date().toLocaleDateString(
    "sv-SE",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <header className="mb-8">
      <div className="min-w-0">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-blue-300">
          Home control
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Family Dashboard
        </h1>

        <p className="mt-2 capitalize text-slate-300">
          {date}
        </p>
      </div>
    </header>
  );
}