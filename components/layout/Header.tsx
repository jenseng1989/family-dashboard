"use client";

type HeaderProps = {
  dashboardName: string;
};

export default function Header({
  dashboardName,
}: HeaderProps) {
  return (
    <header className="mb-8">
      <div className="min-w-0">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-blue-300">
          Home control
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {dashboardName}
        </h1>

      </div>
    </header>
  );
}