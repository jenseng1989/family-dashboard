import { ReactNode } from "react";
import clsx from "clsx";

type CardProps = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function Card({ title, icon, children, className }: CardProps) {
  return (
    <section
      className={clsx(
        "rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl",
        "transition duration-300 hover:-translate-y-1 hover:bg-white/[0.14]",
        className
      )}
    >
      <div className="mb-5 flex items-center gap-3">
        {icon && (
          <div className="rounded-2xl bg-blue-500/20 p-2 text-blue-300">
            {icon}
          </div>
        )}

        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>

      {children}
    </section>
  );
}