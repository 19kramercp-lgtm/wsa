import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

const buttonVariants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
  secondary:
    "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  ghost: "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Badge({ children, tone = "slate" }: PropsWithChildren<{ tone?: "slate" | "green" | "red" | "blue" | "amber" }>) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: PropsWithChildren<{ label: string; hint?: ReactNode }>) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none";

export function Alert({ tone, children }: PropsWithChildren<{ tone: "error" | "success" | "warning" }>) {
  const styles = {
    error: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40",
    success:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40",
    warning:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/40",
  }[tone];
  return <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${styles}`}>{children}</div>;
}
