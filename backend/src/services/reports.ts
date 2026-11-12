import { JournalEntry } from "../models/JournalEntry.js";
import { LedgerState } from "../models/LedgerState.js";
import { LedgerDaily } from "../models/LedgerDaily.js";

export async function activeGeneration() {
  return (
    (await LedgerState.findOne({ key: "active" }).lean())?.generation ??
    "legacy"
  );
}
export const isExpense = (account: string) =>
  account === "salary_expense" ||
  account === "interest_expense" ||
  account.startsWith("expense:");
export async function reports(from: Date, to: Date) {
  if (!Number.isFinite(+from) || !Number.isFinite(+to) || from > to)
    throw new Error("Sana oralig‘i noto‘g‘ri");
  const generation = await activeGeneration();
  const [result] = await LedgerDaily.aggregate([
    { $match: { generation, date: { $lte: to } } },
    {
      $project: {
        date: 1,
        cashFlowCategory: 1,
        account: 1,
        debit: 1,
        credit: 1,
        net: { $subtract: ["$debit", "$credit"] },
      },
    },
    {
      $facet: {
        balances: [{ $group: { _id: "$account", net: { $sum: "$net" } } }],
        period: [
          { $match: { date: { $gte: from } } },
          { $group: { _id: "$account", net: { $sum: "$net" } } },
        ],
        opening: [
          {
            $match: { date: { $lt: from }, account: { $in: ["cash", "bank"] } },
          },
          { $group: { _id: null, net: { $sum: "$net" } } },
        ],
        flows: [
          {
            $match: {
              date: { $gte: from },
              account: { $in: ["cash", "bank"] },
              cashFlowCategory: { $ne: "none" },
            },
          },
          {
            $group: {
              _id: "$cashFlowCategory",
              inflow: { $sum: "$debit" },
              outflow: { $sum: "$credit" },
            },
          },
        ],
      },
    },
  ]);
  const balances = new Map<string, number>(
    result.balances.map((row: any) => [row._id, row.net]),
  );
  const period = new Map<string, number>(
    result.period.map((row: any) => [row._id, row.net]),
  );
  const b = (key: string) => balances.get(key) ?? 0;
  const revenue = -(period.get("course_revenue") ?? 0) || 0;
  const breakdown = [...period]
    .filter(([account]) => isExpense(account))
    .map(([account, amount]) => ({ account, amount }));
  const totalExpenses = breakdown.reduce((sum, row) => sum + row.amount, 0);
  const teacherExpense = period.get("salary_expense") ?? 0;
  const flows = Object.fromEntries(
    ["operating", "investing", "financing"].map((category) => {
      const row = result.flows.find((item: any) => item._id === category);
      return [
        category,
        { inflow: row?.inflow ?? 0, outflow: row?.outflow ?? 0 },
      ];
    }),
  );
  const operating = flows.operating.inflow - flows.operating.outflow;
  const investing = flows.investing.inflow - flows.investing.outflow;
  const financing = flows.financing.inflow - flows.financing.outflow;
  const cash = b("cash") + b("bank");
  const retainedEarnings =
    -b("course_revenue") -
    [...balances]
      .filter(([account]) => isExpense(account))
      .reduce((sum, [, value]) => sum + value, 0);
  const assets = {
    cash,
    cashOnHand: b("cash"),
    bank: b("bank"),
    receivables: b("student_receivable"),
    teacherAdvances: b("teacher_advance"),
    equipment: b("equipment"),
  };
  const liabilities = {
    studentAdvances: -b("deferred_revenue") || 0,
    salaryPayable: -b("salary_payable") || 0,
    loanPayable: -b("loan_payable") || 0,
  };
  const totalAssets =
    cash + assets.receivables + assets.teacherAdvances + assets.equipment;
  const totalLiabilities =
    liabilities.studentAdvances +
    liabilities.salaryPayable +
    liabilities.loanPayable;
  const investorCapital = -b("investor_capital") || 0;
  return {
    profitLoss: {
      revenue,
      teacherExpense,
      otherExpenses: totalExpenses - teacherExpense,
      breakdown,
      totalExpenses,
      netProfit: revenue - totalExpenses,
    },
    cashFlow: {
      openingCash: result.opening[0]?.net ?? 0,
      operating,
      investing,
      financing,
      flows,
      netChange: operating + investing + financing,
      closingCash: cash,
    },
    balance: {
      assets,
      liabilities,
      equity: {
        investorCapital,
        retainedEarnings,
        earnedProfit: retainedEarnings,
      },
      totalAssets,
      totalLiabilities,
      totalEquity: investorCapital + retainedEarnings,
      difference:
        totalAssets - totalLiabilities - investorCapital - retainedEarnings,
    },
  };
}
