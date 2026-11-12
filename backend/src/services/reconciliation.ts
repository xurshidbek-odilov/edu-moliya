import { JournalEntry } from "../models/JournalEntry.js";
import { activeGeneration, reports } from "./reports.js";
import { LedgerDaily } from "../models/LedgerDaily.js";
import { withFinanceLock } from "./lock.js";
import { CashTransaction } from "../models/CashTransaction.js";
import { FinanceEvent } from "../models/FinanceEvent.js";
import { Lesson } from "../models/Lesson.js";

export async function reconcile() {
  return withFinanceLock(check);
}
async function check() {
  const entries = await JournalEntry.find({
    generation: await activeGeneration(),
  })
    .sort({ date: 1 })
    .lean();
  const failures: { month: string; equation: string; difference: number }[] =
    [];
  let months = 0;
  const [cash, events, lessons] = await Promise.all([
    CashTransaction.find({}, "_id").lean(),
    FinanceEvent.find({}, "_id").lean(),
    Lesson.find({ status: "completed" }, "_id").lean(),
  ]);
  const sources = new Set([
    ...cash.map((row) => `CashTransaction:${row._id}`),
    ...events.map((row) => `FinanceEvent:${row._id}`),
    ...lessons.map((row) => `Lesson:${row._id}`),
  ]);
  for (const entry of entries) {
    const key = `${entry.sourceType}:${entry.sourceId}`;
    if (!sources.delete(key))
      failures.push({
        month: entry.date.toISOString().slice(0, 7),
        equation: "Jurnal manbasi",
        difference: 1,
      });
  }
  if (sources.size)
    failures.push({
      month: "all",
      equation: "Jurnalga yozilmagan manbalar",
      difference: sources.size,
    });
  const expected = new Map<string, { debit: number; credit: number }>();
  for (const entry of entries)
    for (const line of entry.lines) {
      const key = `${entry.date.toISOString().slice(0, 10)}:${line.account}:${entry.cashFlowCategory}`;
      const row = expected.get(key) ?? { debit: 0, credit: 0 };
      row.debit += line.debit;
      row.credit += line.credit;
      expected.set(key, row);
    }
  const summaries = await LedgerDaily.find({
    generation: await activeGeneration(),
  }).lean();
  for (const row of summaries) {
    const key = `${row.date!.toISOString().slice(0, 10)}:${row.account}:${row.cashFlowCategory}`;
    const source = expected.get(key);
    const difference =
      Math.abs((source?.debit ?? 0) - row.debit!) +
      Math.abs((source?.credit ?? 0) - row.credit!);
    if (difference)
      failures.push({
        month: row.date!.toISOString().slice(0, 7),
        equation: "Jurnal va hisobot",
        difference,
      });
    expected.delete(key);
  }
  if (expected.size)
    failures.push({
      month: "all",
      equation: "Yetishmagan hisobot qatorlari",
      difference: expected.size,
    });
  for (const entry of entries) {
    const difference = entry.lines.reduce(
      (sum, line) => sum + line.debit - line.credit,
      0,
    );
    if (difference || !Number.isFinite(difference))
      failures.push({
        month: entry.date.toISOString().slice(0, 7),
        equation: "Jurnal",
        difference,
      });
    if (
      entry.lines.some(
        (line) =>
          !Number.isSafeInteger(line.debit) ||
          !Number.isSafeInteger(line.credit) ||
          line.debit < 0 ||
          line.credit < 0,
      )
    )
      failures.push({
        month: entry.date.toISOString().slice(0, 7),
        equation: "Summa",
        difference: NaN,
      });
  }
  if (entries.length) {
    const first = entries[0].date,
      last = entries[entries.length - 1].date;
    let priorRetained = 0;
    for (
      let cursor = new Date(
        Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1),
      );
      cursor <= last;
      cursor = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
      )
    ) {
      const end = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1) - 1,
      );
      const result = await reports(cursor, end);
      const cf = result.cashFlow,
        bs = result.balance;
      const month = cursor.toISOString().slice(0, 7);
      for (const [equation, difference] of [
        ["Balans", bs.totalAssets - bs.totalLiabilities - bs.totalEquity],
        [
          "Pul oqimi",
          cf.openingCash +
            cf.operating +
            cf.investing +
            cf.financing -
            cf.closingCash,
        ],
        [
          "Foyda",
          result.profitLoss.netProfit -
            (bs.equity.retainedEarnings - priorRetained),
        ],
      ] as const)
        if (difference !== 0) failures.push({ month, equation, difference });
      priorRetained = bs.equity.retainedEarnings;
      months++;
    }
  }
  return { months, failures, entries: entries.length };
}
