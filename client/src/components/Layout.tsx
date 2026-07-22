import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  BookIcon,
  CloseIcon,
  ExpenseIcon,
  HomeIcon,
  JournalIcon,
  LedgerIcon,
  MenuIcon,
  PlaneIcon,
  ReportsIcon,
  RevenueIcon,
  UsersIcon,
} from "./Icons";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: HomeIcon, end: true },
  { to: "/chart-of-accounts", label: "Chart of Accounts", icon: BookIcon },
  { to: "/clients", label: "Clients", icon: UsersIcon },
  { to: "/general-journal", label: "General Journal", icon: JournalIcon },
  { to: "/general-ledger", label: "General Ledger", icon: LedgerIcon },
  { to: "/revenues", label: "Revenues", icon: RevenueIcon },
  { to: "/expenses", label: "Expenses", icon: ExpenseIcon },
  { to: "/reports", label: "Reports", icon: ReportsIcon },
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-72 shrink-0 transform bg-slate-900 text-slate-100 transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
              <PlaneIcon width={20} height={20} />
            </span>
            <div className="leading-tight">
              <p className="font-semibold text-sm text-white">Wingspan Aviation</p>
              <p className="text-xs text-slate-400">Accounting</p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 inset-x-0 px-5 py-4 text-xs text-slate-500 border-t border-slate-800">
          Data saved locally to file
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 lg:pl-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
          <button
            className="lg:hidden -ml-1 p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-white">
              <PlaneIcon width={16} height={16} />
            </span>
            <span className="font-semibold text-sm">Wingspan Aviation</span>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
