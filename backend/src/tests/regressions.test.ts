import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { Student } from "../models/Student.js";
import { Teacher } from "../models/Teacher.js";
import { Group } from "../models/Group.js";
import { Lesson } from "../models/Lesson.js";
import { FinanceEvent } from "../models/FinanceEvent.js";
import { JournalEntry } from "../models/JournalEntry.js";
import { rebuildLedger } from "../services/ledger.js";
import { reports, activeGeneration } from "../services/reports.js";
import { reconcile } from "../services/reconciliation.js";
import { lessonPrice } from "../services/pricing.js";
import { app } from "../app.js";
import { env } from "../config/env.js";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "node:net";
before(async () => {
  await mongoose.connect(
    `mongodb://127.0.0.1:27017/edutizim_test_${randomUUID().replaceAll("-", "")}`,
  );
});
beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
const january = () =>
  reports(new Date("2026-01-01"), new Date("2026-01-31T23:59:59Z"));
test("yaxlitlash va chegirma: barcha darslar yig‘indisi aynan oylik narx", () => {
  for (const discount of [0, 10, 33, 100])
    assert.equal(
      Array.from({ length: 12 }, (_, index) =>
        lessonPrice(100001, discount, 12, index),
      ).reduce((a, b) => a + b),
      Math.round((100001 * (100 - discount)) / 100),
    );
});
test("inkassatsiya: umumiy pul va foyda o‘zgarmaydi", async () => {
  await FinanceEvent.create({
    type: "investor_capital",
    date: "2026-01-01",
    amount: 100000,
    paymentMethod: "cash",
  });
  await FinanceEvent.create({
    type: "cash_transfer",
    date: "2026-01-31",
    amount: 70000,
    paymentMethod: "cash",
  });
  await rebuildLedger();
  const r = await january();
  assert.equal(r.balance.assets.cashOnHand, 30000);
  assert.equal(r.balance.assets.bank, 70000);
  assert.equal(r.cashFlow.operating, 0);
  assert.equal(r.cashFlow.financing, 100000);
  assert.equal(r.profitLoss.netProfit, 0);
  assert.equal(r.balance.difference, 0);
  assert.deepEqual((await reconcile()).failures, []);
});
test("kech belgilangan dars o‘z oyida; tarix narx o‘zgarishiga bog‘liq emas", async () => {
  const teacher = await Teacher.create({
    firstName: "A",
    lastName: "B",
    phone: "1",
    salaryPercentage: 50,
  });
  const student = await Student.create({
    firstName: "A",
    lastName: "B",
    phone: "1",
  });
  const group = await Group.create({
    name: "A",
    time: "10:00",
    coursePrice: 120000,
    lessonsPerMonth: 12,
    teacher: teacher._id,
  });
  await Lesson.create({
    group: group._id,
    teacher: teacher._id,
    date: "2026-01-31",
    completedAt: "2026-02-05",
    time: "10:00",
    status: "completed",
    snapshotVersion: 1,
    groupName: "A",
    charges: [{ student: student._id, amount: 10000 }],
    teacherEarning: 5000,
  });
  await rebuildLedger();
  assert.equal((await january()).profitLoss.revenue, 10000);
  await Group.updateOne({ _id: group._id }, { $set: { coursePrice: 900000 } });
  await Teacher.updateOne(
    { _id: teacher._id },
    { $set: { salaryPercentage: 90 } },
  );
  await Promise.all([rebuildLedger(), rebuildLedger()]);
  const r = await january();
  assert.equal(r.profitLoss.revenue, 10000);
  assert.equal(r.profitLoss.teacherExpense, 5000);
  assert.equal(r.balance.difference, 0);
});
test("reconcile buzilgan jurnalni aniqlaydi, uni tuzatib yashirmaydi", async () => {
  await FinanceEvent.create({
    type: "investor_capital",
    date: "2026-01-01",
    amount: 100000,
    paymentMethod: "cash",
  });
  await rebuildLedger();
  const generation = await activeGeneration();
  await JournalEntry.updateOne(
    { generation },
    { $set: { "lines.0.debit": 100001 } },
  );
  assert.ok((await reconcile()).failures.length > 0);
  assert.equal(
    (await JournalEntry.findOne({ generation }))!.lines[0].debit,
    100001,
  );
});
test("HTTP: yanvar oyligi va fevral to‘lovi, inkassatsiya, tahrir va xato summa", async () => {
  const teacher = await Teacher.create({
    firstName: "Test",
    lastName: "Xodim",
    phone: "1",
    salaryPercentage: 0,
  });
  const student = await Student.create({
    firstName: "Test",
    lastName: "Talaba",
    phone: "2",
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const token = jwt.sign({ sub: "test" }, env.jwtSecret);
  const request = async (path: string, method = "GET", body?: unknown) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return { status: response.status, data };
  };
  try {
    assert.equal(
      (
        await request("/finance-events", "POST", {
          type: "salary_accrual",
          date: "2026-01-31",
          amount: 8000000,
          teacherId: String(teacher._id),
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await request("/cash/teacher-salary", "POST", {
          date: "2026-02-05",
          amount: 8000000,
          teacherId: String(teacher._id),
          paymentMethod: "bank_transfer",
        })
      ).status,
      201,
    );
    assert.equal(
      (await request("/reports/profit-loss?month=2026-01")).data.teacherExpense,
      8000000,
    );
    assert.equal(
      (await request("/reports/profit-loss?month=2026-02")).data.teacherExpense,
      0,
    );
    assert.equal(
      (await request("/reports/cash-flow?month=2026-02")).data.operating,
      -8000000,
    );
    assert.equal(
      (await request("/reports/balance?month=2026-02")).data.liabilities
        .salaryPayable,
      0,
    );
    const created = await request("/cash/student-payment", "POST", {
      date: "2026-01-03",
      amount: 100000,
      studentId: String(student._id),
      paymentMethod: "cash",
    });
    assert.equal(created.status, 201);
    const edited = await request(
      `/cash/${created.data.transaction._id}`,
      "PUT",
      {
        date: "2026-01-03",
        amount: 150000,
        studentId: String(student._id),
        paymentMethod: "card",
      },
    );
    assert.equal(edited.status, 200);
    const bs = (await request("/reports/balance?month=2026-01")).data;
    assert.equal(bs.assets.cashOnHand, 0);
    assert.equal(bs.assets.bank, 150000);
    assert.equal(bs.difference, 0);
    assert.equal(
      (
        await request("/cash/student-payment", "POST", {
          date: "2026-01-03",
          amount: "oops",
          studentId: String(student._id),
          paymentMethod: "cash",
        })
      ).status,
      400,
    );
    assert.deepEqual((await reconcile()).failures, []);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
