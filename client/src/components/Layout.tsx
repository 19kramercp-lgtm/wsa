import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  BookIcon,
  BuildingIcon,
  CalendarIcon,
  CloseIcon,
  DocumentIcon,
  ExpenseIcon,
  GraduationCapIcon,
  HomeIcon,
  JournalIcon,
  LedgerIcon,
  LogoutIcon,
  MenuIcon,
  PlaneIcon,
  RepeatIcon,
  ReportsIcon,
  RevenueIcon,
  ShieldIcon,
  UsersIcon,
} from "./Icons";

type Mode = "accounting" | "training";
const MODE_STORAGE_KEY = "wsa-mode";

const ACCOUNTING_NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: HomeIcon, end: true },
  { to: "/chart-of-accounts", label: "Chart of Accounts", icon: BookIcon },
  { to: "/clients", label: "Clients", icon: UsersIcon },
  { to: "/vendors", label: "Vendors", icon: BuildingIcon },
  { to: "/general-ledger", label: "General Ledger", icon: LedgerIcon },
  { to: "/general-journal", label: "General Journal", icon: JournalIcon },
  { to: "/revenues", label: "Revenues", icon: RevenueIcon },
  { to: "/expenses", label: "Expenses", icon: ExpenseIcon },
  { to: "/recurring", label: "Recurring Transactions", icon: RepeatIcon },
  { to: "/reports", label: "Reports", icon: ReportsIcon },
  { to: "/user-accounts", label: "User Accounts", icon: ShieldIcon },
];

const TRAINING_NAV_ITEMS = [
  { to: "/training/calendar", label: "Calendar", icon: CalendarIcon },
  { to: "/training/students", label: "Students", icon: UsersIcon, end: true },
  { to: "/training/instructors", label: "Instructors", icon: GraduationCapIcon },
  { to: "/training/aircraft", label: "Aircraft", icon: PlaneIcon },
  { to: "/training/materials", label: "Training Materials", icon: DocumentIcon },
];

const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator",
  instructor: "Instructor",
  student: "Student",
};

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "administrator";

  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== "undefined" && window.localStorage.getItem(MODE_STORAGE_KEY) === "training"
      ? "training"
      : "accounting"
  );

  useEffect(() => {
    const shouldBeTraining = !isAdmin || location.pathname.startsWith("/training");
    setMode((current) => {
      const next: Mode = shouldBeTraining ? "training" : "accounting";
      return current === next ? current : next;
    });
  }, [location.pathname, isAdmin]);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
    navigate(next === "training" ? "/training/students" : "/");
    setMenuOpen(false);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const navItems = mode === "training" ? TRAINING_NAV_ITEMS : ACCOUNTING_NAV_ITEMS;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden print:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-72 shrink-0 transform bg-slate-900 text-slate-100 transition-transform duration-200 ease-out lg:static lg:translate-x-0 print:hidden ${
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
              <p className="text-xs text-slate-400">{mode === "training" ? "Training" : "Accounting"}</p>
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

        {isAdmin && (
          <div className="px-3 pt-3">
            <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
              <button
                onClick={() => switchMode("accounting")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  mode === "accounting" ? "bg-brand-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
                }`}
              >
                <ReportsIcon width={14} height={14} /> Accounting
              </button>
              <button
                onClick={() => switchMode("training")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  mode === "training" ? "bg-brand-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
                }`}
              >
                <GraduationCapIcon width={14} height={14} /> Training
              </button>
            </div>
          </div>
        )}

        <nav className="px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
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

        <div className="absolute bottom-0 inset-x-0 px-5 py-4 border-t border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400">{user ? ROLE_LABELS[user.role] : ""}</p>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Log out"
              title="Log out"
            >
              <LogoutIcon width={18} height={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 lg:pl-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur print:hidden">
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

        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto print:p-0 print:max-w-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
