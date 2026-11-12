import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ message: "Login va parolni kiriting" });
    return;
  }

  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ message: "Login yoki parol noto‘g‘ri" });
    return;
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    env.jwtSecret,
    {
      expiresIn: "8h",
    },
  );
  res.json({ token, user: { username: user.username, role: user.role } });
});

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json({ authenticated: true });
});
