import { Router } from "express";
import { requireAuth, sanitizeUser, signToken, verifyPassword, hashPassword } from "../auth.js";
import { readDatabase, writeDatabase } from "../db.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = await readDatabase();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!user || !verifyPassword(String(password), user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user.id, db.meta.authSecret);
  res.json({ token, user: sanitizeUser(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  res.json(req.user);
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }

  const db = await readDatabase();
  const user = db.users.find((u) => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!verifyPassword(String(currentPassword), user.passwordHash)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  user.passwordHash = hashPassword(String(newPassword));
  await writeDatabase(db);
  res.json({ ok: true });
});

export default router;
