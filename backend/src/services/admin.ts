import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export async function ensureAdmin(): Promise<void> {
  const existing = await User.findOne({ username: env.adminUsername });
  if (existing) return;

  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  await User.create({
    username: env.adminUsername,
    passwordHash,
    role: "admin",
  });
  console.log(`Admin yaratildi: ${env.adminUsername}`);
}
