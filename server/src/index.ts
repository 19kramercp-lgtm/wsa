import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import accountsRouter from "./routes/accounts.js";
import journalRouter from "./routes/journal.js";
import transactionsRouter from "./routes/transactions.js";
import ledgerRouter from "./routes/ledger.js";
import reportsRouter from "./routes/reports.js";
import periodsRouter from "./routes/periods.js";
import clientsRouter from "./routes/clients.js";
import vendorsRouter from "./routes/vendors.js";
import recurringRouter from "./routes/recurring.js";
import instructorsRouter from "./routes/instructors.js";
import aircraftRouter from "./routes/aircraft.js";
import logbookRouter from "./routes/logbook.js";
import endorsementsRouter from "./routes/endorsements.js";
import requirementsRouter from "./routes/requirements.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.use("/api/accounts", accountsRouter);
app.use("/api/journal-entries", journalRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/ledger", ledgerRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/periods", periodsRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/recurring", recurringRouter);
app.use("/api/instructors", instructorsRouter);
app.use("/api/aircraft", aircraftRouter);
app.use("/api/logbook", logbookRouter);
app.use("/api/endorsements", endorsementsRouter);
app.use("/api/requirements", requirementsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", company: "Wingspan Aviation" });
});

// Serve the built client in production
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Wingspan Aviation accounting server listening on http://0.0.0.0:${PORT}`);
});
