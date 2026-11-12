import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { reconcile } from "../services/reconciliation.js";
await connectDatabase();
try {
  const result = await reconcile();
  for (const equation of ["Balans", "Pul oqimi", "Foyda"]) {
    const failed = result.failures.filter((item) => item.equation === equation);
    console.log(
      `${equation}: ${result.months} oy, ${failed.length} xato, farq ${failed.reduce((sum, row) => sum + Math.abs(row.difference), 0)}`,
    );
  }
  if (result.failures.length) {
    console.table(result.failures);
    process.exitCode = 1;
  } else
    console.log(`OK: ${result.entries} jurnal yozuvi; baza o‘zgartirilmadi.`);
} finally {
  await disconnectDatabase();
}
