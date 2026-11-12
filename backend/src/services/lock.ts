import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

const scope = new AsyncLocalStorage<boolean>();
// One database-wide writer. A dead process releases its lease automatically.
export async function withFinanceLock<T>(work: () => Promise<T>): Promise<T> {
  if (scope.getStore()) return work();
  const collection = mongoose.connection.collection("finance_locks");
  const owner = randomUUID();
  const deadline = Date.now() + 120_000;
  while (true) {
    try {
      const result = await collection.findOneAndUpdate(
        {
          _id: "writer" as never,
          $or: [{ until: { $lt: new Date() } }, { owner }],
        },
        { $set: { owner, until: new Date(Date.now() + 120_000) } },
        { upsert: true, returnDocument: "after" },
      );
      if (result?.owner === owner) break;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    if (Date.now() > deadline)
      throw new Error("Moliya operatsiyasi band. Qayta urinib ko‘ring.");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const timer = setInterval(() => {
    void collection.updateOne(
      { _id: "writer" as never, owner },
      { $set: { until: new Date(Date.now() + 120_000) } },
    );
  }, 20_000);
  try {
    return await scope.run(true, work);
  } finally {
    clearInterval(timer);
    await collection.deleteOne({ _id: "writer" as never, owner });
  }
}
