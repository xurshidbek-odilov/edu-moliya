import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Student } from "../models/Student.js";
import { Teacher } from "../models/Teacher.js";
import { Group } from "../models/Group.js";
import { Lesson } from "../models/Lesson.js";
import { CashTransaction } from "../models/CashTransaction.js";
import { FinanceEvent } from "../models/FinanceEvent.js";
import { ExpenseCategory } from "../models/ExpenseCategory.js";
import { ensureAdmin } from "../services/admin.js";
import { ensureExpenseCategories } from "../services/expenseCategories.js";
import { rebuildLedger } from "../services/ledger.js";
import { lessonPrice } from "../services/pricing.js";
import { reconcile } from "../services/reconciliation.js";

// Never clear an existing database. Use a dedicated new database for demo data.
const dbName = process.env.SEED_DB_NAME ?? "edutizim_demo";
if (!/^edutizim_demo(?:_[a-z0-9]+)?$/.test(dbName))
  throw new Error(
    "Seed faqat edutizim_demo yoki edutizim_demo_* bazasiga yoziladi",
  );
await mongoose.connect(env.mongoUri, { dbName });
async function seed() {
  const marker = await mongoose.connection
    .collection("seed_metadata")
    .findOne({ key: "edutizim-demo-v1" });
  if (marker) {
    const result = await reconcile();
    console.log(
      "Demo ma’lumotlar avval yaratilgan; takror yozilmadi.",
      JSON.stringify(result),
    );
    if (result.failures.length) process.exitCode = 1;
    return;
  }
  if (
    (await Student.exists({})) ||
    (await CashTransaction.exists({})) ||
    (await FinanceEvent.exists({})) ||
    (await Lesson.exists({}))
  )
    throw new Error(
      "Demo baza bo‘sh emas. Ma’lumot o‘chirilmadi. Yangi SEED_DB_NAME tanlang.",
    );
  await ensureAdmin();
  await ensureExpenseCategories();
  const categories = await ExpenseCategory.find().lean();
  const category = (code: string) =>
    categories.find((item) => item.code === code)!._id;
  const teachers = await Teacher.insertMany(
    Array.from({ length: 20 }, (_, i) => ({
      firstName: `Xodim ${i + 1}`,
      lastName: "Demo",
      phone: `+99890100${String(i).padStart(4, "0")}`,
      salaryPercentage: 0,
    })),
  );
  const groups = await Group.insertMany(
    teachers.map((teacher, i) => ({
      name: `Guruh ${i + 1}`,
      time: "14:00",
      coursePrice: 600_000,
      lessonsPerMonth: 12,
      teacher: teacher._id,
      weekdays: ["Dushanba", "Chorshanba", "Juma"],
    })),
  );
  const students = await Student.insertMany(
    Array.from({ length: 500 }, (_, i) => ({
      firstName: `O‘quvchi ${i + 1}`,
      lastName: "Demo",
      phone: `+99893${String(i).padStart(7, "0")}`,
      group: groups[Math.floor(i / 25)]._id,
      discountPercentage: i % 10 === 0 ? 10 : 0,
    })),
  );
  await Group.bulkWrite(
    groups.map((group) => ({
      updateOne: {
        filter: { _id: group._id },
        update: {
          $set: {
            students: students
              .filter((s) => String(s.group) === String(group._id))
              .map((s) => s._id),
          },
        },
      },
    })),
  );
  const cash: any[] = [],
    finance: any[] = [],
    lessons: any[] = [];
  const date = (month: number, day: number) =>
    new Date(Date.UTC(2023, month, day, 12));
  finance.push(
    {
      type: "investor_capital",
      date: date(0, 1),
      amount: 500_000_000,
      investorName: "Investor A",
      paymentMethod: "bank_transfer",
    },
    {
      type: "investor_capital",
      date: date(0, 1),
      amount: 100_000_000,
      investorName: "Investor B",
      paymentMethod: "cash",
    },
    {
      type: "investor_capital",
      date: date(18, 1),
      amount: 150_000_000,
      investorName: "Investor A",
      paymentMethod: "bank_transfer",
    },
    {
      type: "loan_received",
      date: date(0, 2),
      amount: 200_000_000,
      annualInterestRate: 18,
      paymentMethod: "bank_transfer",
    },
  );
  const expense = (
    month: number,
    day: number,
    code: string,
    amount: number,
    paymentMethod = "bank_transfer",
  ) =>
    cash.push({
      type: "expense",
      date: date(month, day),
      expenseCategory: category(code),
      amount,
      paymentMethod,
      comment: code,
    });
  expense(0, 8, "equipment", 240_000_000);
  let loan = 200_000_000;
  for (let month = 0; month < 36; month++) {
    let cashCollected = 0;
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const monthly = Math.round(
        (600_000 * (100 - student.discountPercentage)) / 100,
      );
      const advance = i % 5 === 0;
      if ((advance && month % 3 !== 0) || (!advance && (i + month) % 17 === 0))
        continue;
      const amount = monthly * (advance ? 3 : 1);
      const method = ["cash", "card", "payme", "click"][i % 4];
      if (method === "cash") cashCollected += amount;
      cash.push({
        type: "student_payment",
        student: student._id,
        groupSnapshot: student.group,
        date: date(month, 3),
        amount,
        paymentMethod: method,
        comment: advance ? "3 oylik oldindan to‘lov" : "Oylik to‘lov",
      });
    }
    const end = new Date(Date.UTC(2023, month + 1, 0, 12));
    for (const teacher of teachers) {
      finance.push({
        type: "salary_accrual",
        teacher: teacher._id,
        date: end,
        amount: 8_000_000,
        comment: "Oy uchun ish haqi",
      });
      if (month > 0)
        cash.push({
          type: "teacher_salary",
          teacher: teacher._id,
          date: date(month, 5),
          amount: 8_000_000,
          paymentMethod: "bank_transfer",
          comment: "O‘tgan oy maoshi",
        });
    }
    expense(month, 5, "rent", 10_000_000);
    expense(month, 15, "electricity", 2_000_000);
    expense(month, 15, "utilities", 1_000_000);
    expense(month, 15, "marketing", 5_000_000);
    expense(month, 20, "loan_interest", Math.round((loan * 18) / 1200));
    const principal = month === 35 ? loan : 5_000_000;
    expense(month, 20, "loan_principal", principal);
    loan -= principal;
    finance.push({
      type: "cash_transfer",
      date: end,
      amount: cashCollected,
      paymentMethod: "cash",
      comment: "Oy oxiri inkassatsiya",
    });
    const days: Date[] = [];
    for (let day = 1; day <= end.getUTCDate() && days.length < 12; day++) {
      const d = date(month, day);
      if ([1, 3, 5].includes(d.getUTCDay())) days.push(d);
    }
    for (const group of groups) {
      const roster = students.filter(
        (student) => String(student.group) === String(group._id),
      );
      days.forEach((d, index) => {
        const charges = roster.map((student) => ({
          student: student._id,
          amount: lessonPrice(600_000, student.discountPercentage, 12, index),
        }));
        const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
        lessons.push({
          group: group._id,
          teacher: group.teacher,
          date: d,
          time: group.time,
          status: "completed",
          completedAt: d,
          snapshotVersion: 1,
          groupName: group.name,
          charges,
          studentSnapshot: roster.map((s) => s._id),
          studentCharge: 50_000,
          totalCharge: total,
          teacherEarning: 0,
          centerEarning: total,
          lessonIndex: index,
        });
      });
    }
  }
  await CashTransaction.insertMany(cash);
  await FinanceEvent.insertMany(finance);
  await Lesson.insertMany(lessons);
  console.log(
    `Baza ${dbName}: 500 o‘quvchi, 20 xodim, ${cash.length} kassa operatsiyasi, ${finance.length} moliyaviy hodisa, ${lessons.length} dars.`,
  );
  await rebuildLedger();
  const result = await reconcile();
  console.log(JSON.stringify(result));
  if (result.failures.length) process.exitCode = 1;
  else
    await mongoose.connection
      .collection("seed_metadata")
      .insertOne({ key: "edutizim-demo-v1", createdAt: new Date() });
}
try {
  await seed();
} finally {
  await mongoose.disconnect();
}
