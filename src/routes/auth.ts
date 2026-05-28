import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { eq } from "drizzle-orm";

const router = Router();
const JWT_SECRET = process.env["SESSION_SECRET"] ?? "quranverse-secret-dev";
const COOKIE_NAME = "qv_token";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env["NODE_ENV"] === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function signToken(payload: { id: number; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { username, email, password, displayName } = req.body ?? {};
  if (!username || !email || !password) {
    res.status(400).json({ error: "username, email, and password are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }
  const existingUsername = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existingUsername.length > 0) {
    res.status(409).json({ error: "This username is already taken" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const initials = (displayName ?? username).slice(0, 2).toUpperCase();
  const [user] = await db.insert(users).values({
    username,
    email,
    passwordHash,
    displayName: displayName ?? username,
    avatarInitials: initials,
  }).returning();
  const token = signToken({ id: user.id, email: user.email });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  res.status(201).json({
    user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName, avatarInitials: user.avatarInitials },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = signToken({ id: user.id, email: user.email });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  res.json({
    user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName, avatarInitials: user.avatarInitials },
  });
});

router.post("/auth/logout", (_req, res): void => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const token = (req as any).cookies?.[COOKIE_NAME];
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number };
    const [user] = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    res.json({ id: user.id, username: user.username, email: user.email, displayName: user.displayName, avatarInitials: user.avatarInitials });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
