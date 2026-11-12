import { CashTransaction } from "../models/CashTransaction.js";
import { CenterAccount } from "../models/CenterAccount.js";

export async function reconcileCashAccount(): Promise<void> {
  const transactions = await CashTransaction.find(
    {},
    "type amount paymentMethod",
  ).lean();
  let cashOnHand = 0;
  let bankBalance = 0;

  for (const transaction of transactions) {
    const direction = transaction.type === "student_payment" ? 1 : -1;
    const amount = transaction.amount * direction;
    const method = transaction.paymentMethod ?? "cash";
    if (method === "cash") cashOnHand += amount;
    else bankBalance += amount;
  }

  await CenterAccount.updateOne(
    { key: "main" },
    {
      $set: { cashOnHand, bankBalance, cashBalance: cashOnHand + bankBalance },
      $setOnInsert: { key: "main", earnedProfit: 0 },
    },
    { upsert: true },
  );
}
