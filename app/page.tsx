import Dashboard from "@/components/dashboard/Dashboard";
import Header from "@/components/layout/Header";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="pointer-events-none absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="pointer-events-none absolute inset-0 bg-slate-950/15" />

      <div className="relative z-10 mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
        <Header />
        <Dashboard />
      </div>
    </main>
  );
}