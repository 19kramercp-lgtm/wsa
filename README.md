# Wingspan Aviation — Accounting

A full-stack double-entry accounting web app built for Wingspan Aviation, a flight
instruction company. Record revenue and expenses, browse the chart of accounts,
general journal, and general ledger, and view standard financial reports —
from a laptop or a phone.

## Stack

- **Server**: Node.js + Express + TypeScript. Stores all data as JSON on disk
  (`server/data/wingspan-ledger.json`), so every entry survives restarts with
  no external database to install.
- **Client**: React + Vite + TypeScript + Tailwind CSS. Responsive layout with
  a hamburger menu on mobile and a persistent sidebar on desktop.

## Getting started

```bash
npm run install:all   # installs server + client dependencies
npm run dev            # runs the API (port 4000) and the web app (port 5173)
```

Open **http://localhost:5173** in your browser.

### Using it from your phone

The dev server binds to your machine's network interfaces, not just
`localhost`. With your laptop and phone on the same Wi‑Fi network:

1. Run `npm run dev` on your laptop.
2. Find your laptop's local IP address (e.g. `192.168.1.23` — on macOS:
   `ipconfig getifaddr en0`; on Windows: `ipconfig`).
3. On your phone's browser, go to `http://<that-ip>:5173`.

For access away from your home network (e.g. from anywhere, anytime), build
the app (`npm run build`) and deploy the `server` folder — which also serves
the built client — to any Node host (Render, Fly.io, Railway, a VPS, etc.),
then browse to that host's URL from either device.

### Production build

```bash
npm run build   # builds the client and compiles the server
npm start        # serves the built client + API from a single process on PORT (default 4000)
```

## How data is saved

Every account, journal entry, revenue, and expense is written to
`server/data/wingspan-ledger.json` on the server's disk immediately after
each change (writes are atomic and queued to avoid corruption). There is no
separate database to configure — the file **is** the database. Back it up by
copying that file; restore by putting it back in place before starting the
server.

The file is deliberately excluded from git (see `.gitignore`) since it's
runtime state, not source code. On first run, the server automatically seeds
it with a chart of accounts tailored to a flight school (see below).

## Accounts & roles

Every user signs in with an email and password. There are three roles:

- **Administrator** — sees both the Accounting and Training tabs, and can
  manage user accounts from **User Accounts** (under Accounting).
- **Instructor** — sees only the Training tab, and can add/edit/delete
  students' endorsements and requirement checks, training materials, and
  calendar events.
- **Student** — sees only the Training tab, view-only (no add/edit/delete
  controls anywhere in Training).

On first run the server seeds one administrator account:

- Email: `admin@wingspanaviation.test`
- Password: `wingspan-admin`

Sign in with that account and create instructor/student accounts from
**User Accounts**. Change the seeded password from there (edit the account)
once you've signed in.

## Features

- **Dashboard** — month-to-date revenue/expenses, year-to-date net income,
  cash on hand, and recent activity.
- **Chart of Accounts** — add, edit, deactivate, or delete accounts, grouped
  by Assets / Liabilities / Equity / Revenue / Expenses. Seeded with accounts
  relevant to a flight instruction business (Flight Instruction Revenue,
  Aircraft Maintenance, Fuel Expense, Instructor Wages, etc.).
- **Revenues** — a simple form to record income (e.g. "2 hrs dual instruction")
  against a revenue account and the account it was deposited to. Posts a
  balanced double-entry transaction automatically.
- **Expenses** — the same idea for costs (fuel, maintenance, insurance, etc.),
  paid from a cash account or put on account payable.
- **General Journal** — the full chronological, double-entry record of every
  transaction. Supports manual multi-line journal entries for anything the
  quick-entry forms don't cover (adjusting entries, depreciation, transfers).
- **General Ledger** — pick any account to see its full transaction history
  and running balance.
- **Reports** — Trial Balance, Income Statement (P&L), Balance Sheet, and
  Statement of Cash Flows, all driven by a shared monthly period selector
  (with prev/next navigation) so you can page through any month.
- **Close the books** — close a month from the Reports tab to lock it: no
  revenue, expense, or journal entry dated in that month can be added,
  edited, or deleted (in the API or the UI) until it's reopened. Forms warn
  you up front if the date you picked falls in a closed month.
- **Statement of Cash Flows** — derived automatically from actual cash
  account activity each period, categorized into Operating / Investing /
  Financing based on each account's `cashFlowCategory` (editable per account
  in the Chart of Accounts; revenue and expenses are always Operating).
- **Students** — the training-side view of Clients, with FAR 61 requirement
  checklists and logbook endorsements per certificate track.
- **Training Materials** — reference material and study links organized into
  Private, Instrument, Commercial, and CFI categories.
- **Calendar** — a month-view schedule of lessons and other training events.

## Project structure

```
server/            Express API + file-based JSON storage
  src/
    db.ts          Read/write the JSON data file, seed chart of accounts + admin account
    auth.ts         Token signing/verification, requireAuth/requireRole middleware
    password.ts     Password hashing (scrypt)
    routes/         accounts, journal-entries, transactions, ledger, reports,
                    auth, users, training-materials, calendar, ...
  data/             wingspan-ledger.json lives here at runtime

client/            React + Vite + Tailwind app
  src/
    context/AuthContext.tsx  Signed-in user, login/logout
    components/     Layout (role-aware nav), RouteGuards, shared UI primitives
    pages/          Dashboard, ChartOfAccounts, ..., Login, UserAccounts,
                    Students, StudentProfile, TrainingMaterials, TrainingCalendar
    api/client.ts   Typed fetch wrapper for the server's REST API (adds auth token)
```
