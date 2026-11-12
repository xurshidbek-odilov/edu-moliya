import { performance } from "node:perf_hooks";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { reports } from "../services/reports.js";
import { JournalEntry } from "../models/JournalEntry.js";
import { activeGeneration } from "../services/reports.js";
import { app } from "../app.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AddressInfo } from "node:net";
await connectDatabase();
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.on("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const token = jwt.sign({ sub: "benchmark" }, env.jwtSecret, {
  expiresIn: "5m",
});
try {
  const latest = await JournalEntry.findOne({
    generation: await activeGeneration(),
  })
    .sort({ date: -1 })
    .lean();
  if (!latest) throw new Error("Benchmark uchun ma’lumot yo‘q");
  const from = new Date(
    Date.UTC(latest.date.getUTCFullYear(), latest.date.getUTCMonth(), 1),
  );
  const to = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1) - 1,
  );
  for (const endpoint of ["profit-loss", "cash-flow", "balance"]) {
    const durations = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const response = await fetch(
        `${base}/api/reports/${endpoint}?month=${from.toISOString().slice(0, 7)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error(await response.text());
      await response.json();
      durations.push(Math.round(performance.now() - start));
    }
    console.log(
      `${endpoint}: ${durations.join(", ")} ms; max=${Math.max(...durations)} ms`,
    );
    if (Math.max(...durations) >= 1000) process.exitCode = 1;
  }
} finally {
  server.close();
  await disconnectDatabase();
}
