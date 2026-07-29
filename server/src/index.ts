import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth, requireRole } from "./auth.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import accountsRouter from "./routes/accounts.js";
import journalRouter from "./routes/journal.js";
import transactionsRouter from "./routes/transactions.js";
import ledgerRouter from "./routes/ledger.js";
import reportsRouter from "./routes/reports.js";
import periodsRouter from "./routes/periods.js";
import clientsRouter from "./routes/clients.js";
import vendorsRouter from "./routes/vendors.js";
import recurringRouter from "./routes/recurring.js";
import endorsementsRouter from "./routes/endorsements.js";
import requirementsRouter from "./routes/requirements.js";
import trainingMaterialsRouter from "./routes/training-materials.js";
import calendarRouter from "./routes/calendar.js";
import aircraftRouter from "./routes/aircraft.js";
import classroomsRouter from "./routes/classrooms.js";
import instructorsRouter from "./routes/instructors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", company: "Wingspan Aviation" });
});

// Public: logging in doesn't require a session yet.
app.use("/api/auth", authRouter);

// Everything below requires a signed-in account.
const write = requireRole("administrator", "instructor");

// Accounting — administrator only.
app.use("/api/accounts", requireAuth, requireRole("administrator"), accountsRouter);
app.use("/api/journal-entries", requireAuth, requireRole("administrator"), journalRouter);
app.use("/api/transactions", requireAuth, requireRole("administrator"), transactionsRouter);
app.use("/api/ledger", requireAuth, requireRole("administrator"), ledgerRouter);
app.use("/api/reports", requireAuth, requireRole("administrator"), reportsRouter);
app.use("/api/periods", requireAuth, requireRole("administrator"), periodsRouter);
app.use("/api/vendors", requireAuth, requireRole("administrator"), vendorsRouter);
app.use("/api/recurring", requireAuth, requireRole("administrator"), recurringRouter);
app.use("/api/users", requireAuth, requireRole("administrator"), usersRouter);

// Clients (students) — readable by any signed-in role, writes restricted to
// administrator/instructor since students should only view training data.
app.use(
  "/api/clients",
  requireAuth,
  (req, res, next) => (req.method === "GET" ? next() : write(req, res, next)),
  clientsRouter
);

// Training — viewable by every role, editable by administrator/instructor only.
app.use(
  "/api/endorsements",
  requireAuth,
  (req, res, next) => (req.method === "GET" ? next() : write(req, res, next)),
  endorsementsRouter
);
app.use(
  "/api/requirements",
  requireAuth,
  (req, res, next) => (req.method === "GET" ? next() : write(req, res, next)),
  requirementsRouter
);
app.use(
  "/api/training-materials",
  requireAuth,
  (req, res, next) => (req.method === "GET" ? next() : write(req, res, next)),
  trainingMaterialsRouter
);
app.use(
  "/api/calendar",
  requireAuth,
  (req, res, next) => (req.method === "GET" ? next() : write(req, res, next)),
  calendarRouter
);
app.use(
  "/api/aircraft",
  requireAuth,
  (req, res, next) => (req.method === "GET" ? next() : write(req, res, next)),
  aircraftRouter
);
app.use(
  "/api/classrooms",
  requireAuth,
  (req, res, next) => (req.method === "GET" ? next() : write(req, res, next)),
  classroomsRouter
);
app.use("/api/instructors", requireAuth, instructorsRouter);

// Serve the built client in production
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Wingspan Aviation accounting server listening on http://0.0.0.0:${PORT}`);
});
