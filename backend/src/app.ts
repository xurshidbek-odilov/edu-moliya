import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { crmRouter } from "./routes/crm.js";
import { requireAuth } from "./middleware/auth.js";

export const app = express();

app.use(
  cors({
    origin(origin, callback) {
      const isConfiguredFrontend = origin === env.frontendUrl;
      const isLocalVite = origin
        ? /^http:\/\/(localhost|127\.0\.0\.1):517\d$/.test(origin)
        : false;

      if (!origin || isConfiguredFrontend || isLocalVite) {
        callback(null, true);
        return;
      }

      callback(new Error("Bu manbaga CORS ruxsati berilmagan"));
    },
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api", requireAuth, crmRouter);

app.use((_req, res) => res.status(404).json({ message: "Endpoint topilmadi" }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const err = error as { message?: string; code?: number };
  res.status(err.code === 11000 ? 409 : 400).json({ message: err.code === 11000 ? "Bu yozuv mavjud" : err.message ?? "Amal bajarilmadi" });
});
