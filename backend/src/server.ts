import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { ensureAdmin } from "./services/admin.js";
import { ensureExpenseCategories } from "./services/expenseCategories.js";
import { rebuildLedger } from "./services/ledger.js";

async function start(): Promise<void> {
  await connectDatabase();
  await ensureAdmin();
  await ensureExpenseCategories();
  await rebuildLedger();
  app.listen(env.port, () =>
    console.log(`Backend: http://localhost:${env.port}`),
  );
}

start().catch((error) => {
  console.error("Backend ishga tushmadi:", error);
  process.exit(1);
});
