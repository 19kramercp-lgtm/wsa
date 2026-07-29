import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { hashPassword, sanitizeUser } from "../auth.js";
import { readDatabase, writeDatabase } from "../db.js";
import type { User, UserRole } from "../types.js";

const router = Router();

const VALID_ROLES: UserRole[] = ["administrator", "instructor", "student"];

router.get("/", async (_req, res) => {
  const db = await readDatabase();
  res.json(db.users.map(sanitizeUser));
});

router.post("/", async (req, res) => {
  const { name, email, password, role, clientId } = req.body ?? {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required" });
  if (!email || !String(email).trim()) return res.status(400).json({ error: "Email is required" });
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: "Role must be administrator, instructor, or student" });
  }

  const db = await readDatabase();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const user: User = {
    id: uuidv4(),
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(String(password)),
    role,
    clientId: clientId || null,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await writeDatabase(db);
  res.status(201).json(sanitizeUser(user));
});

router.put("/:id", async (req, res) => {
  const db = await readDatabase();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "Account not found" });

  const { name, email, password, role, clientId } = req.body ?? {};
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ error: "Name cannot be empty" });
    user.name = String(name).trim();
  }
  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail) return res.status(400).json({ error: "Email cannot be empty" });
    if (db.users.some((u) => u.id !== user.id && u.email.toLowerCase() === normalizedEmail)) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }
    user.email = normalizedEmail;
  }
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: "Role must be administrator, instructor, or student" });
    }
    if (user.role === "administrator" && role !== "administrator") {
      const otherAdmins = db.users.filter((u) => u.id !== user.id && u.role === "administrator");
      if (otherAdmins.length === 0) {
        return res.status(409).json({ error: "There must be at least one administrator account" });
      }
    }
    user.role = role;
  }
  if (clientId !== undefined) user.clientId = clientId || null;
  if (password) {
    if (String(password).length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    user.passwordHash = hashPassword(String(password));
  }

  await writeDatabase(db);
  res.json(sanitizeUser(user));
});

router.delete("/:id", async (req, res) => {
  const db = await readDatabase();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "Account not found" });

  if (user.role === "administrator") {
    const otherAdmins = db.users.filter((u) => u.id !== user.id && u.role === "administrator");
    if (otherAdmins.length === 0) {
      return res.status(409).json({ error: "There must be at least one administrator account" });
    }
  }
  if (req.user && req.user.id === user.id) {
    return res.status(409).json({ error: "You cannot delete your own account while signed in" });
  }

  db.users = db.users.filter((u) => u.id !== user.id);
  await writeDatabase(db);
  res.status(204).send();
});

export default router;
