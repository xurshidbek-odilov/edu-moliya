import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import { CashTransaction } from "../models/CashTransaction.js";
import { ExpenseCategory } from "../models/ExpenseCategory.js";
import { FinanceEvent } from "../models/FinanceEvent.js";
import { Group } from "../models/Group.js";
import { JournalEntry } from "../models/JournalEntry.js";
import { Lesson } from "../models/Lesson.js";
import { Student } from "../models/Student.js";
import { Teacher } from "../models/Teacher.js";
import { rebuildLedger } from "../services/ledger.js";
import { activeGeneration, reports } from "../services/reports.js";
import { reconcile } from "../services/reconciliation.js";
import { lessonPrice } from "../services/pricing.js";
import { randomUUID } from "node:crypto";

before(async () => {
  await mongoose.connect(
    `mongodb://127.0.0.1:27017/edutizim_test_${randomUUID().replaceAll("-", "")}`,
  );
});
beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});
afterEach(async () => {
  assert.deepEqual((await reconcile()).failures, []);
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

async function entries(from: string, to: string) {
  return JournalEntry.find({
    generation: await activeGeneration(),
    date: {
      $gte: new Date(`${from}T00:00:00.000Z`),
      $lte: new Date(`${to}T23:59:59.999Z`),
    },
  }).lean();
}
function net(items: any[], accounts: string[]) {
  return items.reduce(
    (total, entry) =>
      total +
      entry.lines.reduce(
        (sum: number, line: any) =>
          accounts.includes(line.account)
            ? sum + line.debit - line.credit
            : sum,
        0,
      ),
    0,
  );
}

test("oldindan to‘lov uch oyda daromadga aylanadi", async () => {
  const teacher = await Teacher.create({
    firstName: "Test",
    lastName: "Teacher",
    phone: "1",
    salaryPercentage: 0,
  });
  const student = await Student.create({
    firstName: "Test",
    lastName: "Student",
    phone: "2",
  });
  const group = await Group.create({
    name: "A",
    time: "10:00",
    coursePrice: 600_000,
    lessonsPerMonth: 1,
    teacher: teacher._id,
    weekdays: ["Dushanba"],
    students: [student._id],
  });
  await CashTransaction.create({
    type: "student_payment",
    amount: 1_800_000,
    student: student._id,
    paymentMethod: "cash",
    date: new Date("2026-01-10T12:00:00Z"),
  });
  for (const date of ["2026-01-31", "2026-02-28", "2026-03-31"])
    await Lesson.create({
      group: group._id,
      teacher: teacher._id,
      date,
      time: "10:00",
      status: "completed",
      completedAt: new Date(`${date}T12:00:00Z`),
      studentCharge: 600_000,
      totalCharge: 600_000,
      studentSnapshot: [student._id],
    });
  await rebuildLedger();
  const january = await entries("2026-01-01", "2026-01-31");
  const throughJanuary = january;
  assert.equal(-net(january, ["course_revenue"]), 600_000);
  assert.equal(-net(throughJanuary, ["deferred_revenue"]), 1_200_000);
  assert.equal(net(january, ["cash", "bank"]), 1_800_000);
  const throughMarch = await entries("2026-01-01", "2026-03-31");
  assert.equal(Math.abs(net(throughMarch, ["deferred_revenue"])), 0);
  assert.equal(-net(throughMarch, ["course_revenue"]), 1_800_000);
  const report = await reports(
    new Date("2026-01-01"),
    new Date("2026-01-31T23:59:59Z"),
  );
  assert.equal(report.profitLoss.revenue, 600_000);
  assert.equal(report.balance.liabilities.studentAdvances, 1_200_000);
  assert.equal(report.cashFlow.flows.operating.inflow, 1_800_000);
});

test("ish haqi hisoblangan oyda xarajat, to‘langan oyda pul chiqimi bo‘ladi", async () => {
  const teacher = await Teacher.create({
    firstName: "Xodim",
    lastName: "A",
    phone: "1",
    salaryPercentage: 0,
  });
  await FinanceEvent.create({
    type: "salary_accrual",
    date: new Date("2026-01-31T12:00:00Z"),
    amount: 8_000_000,
    teacher: teacher._id,
  });
  await CashTransaction.create({
    type: "teacher_salary",
    date: new Date("2026-02-05T12:00:00Z"),
    amount: 8_000_000,
    teacher: teacher._id,
    paymentMethod: "bank_transfer",
  });
  await rebuildLedger();
  const january = await entries("2026-01-01", "2026-01-31");
  const february = await entries("2026-02-01", "2026-02-28");
  const throughFebruary = await entries("2026-01-01", "2026-02-28");
  assert.equal(net(january, ["salary_expense"]), 8_000_000);
  assert.equal(-net(january, ["salary_payable"]), 8_000_000);
  assert.equal(net(january, ["cash", "bank"]), 0);
  assert.equal(net(february, ["salary_expense"]), 0);
  assert.equal(net(february, ["cash", "bank"]), -8_000_000);
  assert.equal(Math.abs(net(throughFebruary, ["salary_payable"])), 0);
  const report = await reports(
    new Date("2026-02-01"),
    new Date("2026-02-28T23:59:59Z"),
  );
  assert.equal(report.profitLoss.teacherExpense, 0);
  assert.equal(report.cashFlow.flows.operating.outflow, 8_000_000);
  assert.equal(report.balance.liabilities.salaryPayable, 0);
});

test("investor kapitali foyda emas va moliyaviy kirim", async () => {
  await FinanceEvent.create({
    type: "investor_capital",
    date: new Date("2026-01-05T12:00:00Z"),
    amount: 500_000_000,
    investorName: "Investor",
    paymentMethod: "bank_transfer",
  });
  await rebuildLedger();
  const january = await entries("2026-01-01", "2026-01-31");
  assert.equal(Math.abs(net(january, ["course_revenue"])), 0);
  assert.equal(-net(january, ["investor_capital"]), 500_000_000);
  assert.equal(net(january, ["cash", "bank"]), 500_000_000);
  const report = await reports(
    new Date("2026-01-01"),
    new Date("2026-01-31T23:59:59Z"),
  );
  assert.equal(report.profitLoss.netProfit, 0);
  assert.equal(report.cashFlow.flows.financing.inflow, 500_000_000);
  assert.equal(report.balance.equity.investorCapital, 500_000_000);
  assert.equal(
    january.filter((entry) => entry.cashFlowCategory === "operating").length,
    0,
  );
});

test("kredit asosiy qarzi va foizi to‘g‘ri ajraladi", async () => {
  const interest = await ExpenseCategory.create({
    name: "Kredit foizi",
    code: "loan_interest",
    cashFlowType: "operating",
    affectsProfit: true,
  });
  const principal = await ExpenseCategory.create({
    name: "Kredit asosiy qarzi",
    code: "loan_principal",
    cashFlowType: "financing",
    affectsProfit: false,
  });
  await FinanceEvent.create({
    type: "loan_received",
    date: new Date("2026-02-01T12:00:00Z"),
    amount: 200_000_000,
    annualInterestRate: 18,
    paymentMethod: "bank_transfer",
  });
  await CashTransaction.create({
    type: "expense",
    date: new Date("2026-02-20T12:00:00Z"),
    amount: 3_000_000,
    expenseCategory: interest._id,
    paymentMethod: "bank_transfer",
  });
  await CashTransaction.create({
    type: "expense",
    date: new Date("2026-02-20T12:00:00Z"),
    amount: 9_000_000,
    expenseCategory: principal._id,
    paymentMethod: "bank_transfer",
  });
  await rebuildLedger();
  const february = await entries("2026-02-01", "2026-02-28");
  assert.equal(net(february, ["interest_expense"]), 3_000_000);
  assert.equal(-net(february, ["loan_payable"]), 191_000_000);
  const report = await reports(
    new Date("2026-02-01"),
    new Date("2026-02-28T23:59:59Z"),
  );
  assert.equal(report.profitLoss.totalExpenses, 3_000_000);
  assert.equal(report.cashFlow.financing, 191_000_000);
  assert.equal(report.balance.liabilities.loanPayable, 191_000_000);
  assert.equal(
    february
      .filter((entry) => entry.cashFlowCategory === "financing")
      .reduce((sum, entry) => sum + net([entry], ["cash", "bank"]), 0),
    191_000_000,
  );
  assert.equal(
    february
      .filter((entry) => entry.cashFlowCategory === "operating")
      .reduce((sum, entry) => sum + net([entry], ["cash", "bank"]), 0),
    -3_000_000,
  );
});

test("jihoz xaridi foydaga tegmaydi va aktiv yaratadi", async () => {
  const equipment = await ExpenseCategory.create({
    name: "Jihoz",
    code: "equipment",
    cashFlowType: "investing",
    affectsProfit: false,
  });
  await CashTransaction.create({
    type: "expense",
    date: new Date("2026-01-08T12:00:00Z"),
    amount: 240_000_000,
    expenseCategory: equipment._id,
    paymentMethod: "bank_transfer",
  });
  await rebuildLedger();
  const january = await entries("2026-01-01", "2026-01-31");
  assert.equal(net(january, ["salary_expense", "interest_expense"]), 0);
  assert.equal(net(january, ["equipment"]), 240_000_000);
  const report = await reports(
    new Date("2026-01-01"),
    new Date("2026-01-31T23:59:59Z"),
  );
  assert.equal(report.profitLoss.totalExpenses, 0);
  assert.equal(report.balance.assets.equipment, 240_000_000);
  assert.equal(report.cashFlow.flows.investing.outflow, 240_000_000);
  assert.equal(
    january
      .filter((entry) => entry.cashFlowCategory === "investing")
      .reduce((sum, entry) => sum + net([entry], ["cash", "bank"]), 0),
    -240_000_000,
  );
});
