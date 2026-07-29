import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { readDatabase } from "./db.js";
import type { SafeUser, User, UserRole } from "./types.js";

export { hashPassword, verifyPassword } from "./password.js";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signToken(userId: string, secret: string): string {
  const payload = JSON.stringify({ sub: userId, exp: Date.now() + TOKEN_TTL_MS });
  const body = base64url(payload);
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token: string, secret: string): { sub: string; exp: number } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const db = await readDatabase();
  const payload = verifyToken(token, db.meta.authSecret);
  if (!payload) return res.status(401).json({ error: "Session expired, please log in again" });

  const user = db.users.find((u) => u.id === payload.sub);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  req.user = sanitizeUser(user);
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do that" });
    }
    next();
  };
}
