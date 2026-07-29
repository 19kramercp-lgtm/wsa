import { Router } from "express";
import { sanitizeUser } from "../auth.js";
import { readDatabase } from "../db.js";

const router = Router();

// Read-only roster for the Training tab — any signed-in role can see who
// the instructors are, but managing accounts still requires the
// administrator-only /api/users routes.
router.get("/", async (_req, res) => {
  const db = await readDatabase();
  const instructors = db.users
    .filter((u) => u.role === "instructor")
    .map(sanitizeUser)
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(instructors);
});

export default router;
