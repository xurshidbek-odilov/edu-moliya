import { randomUUID } from "node:crypto";
import { LedgerState } from "../models/LedgerState.js";
import { LedgerDaily } from "../models/LedgerDaily.js";
import { withFinanceLock } from "./lock.js";
import { Types } from "mongoose";
import { CashTransaction } from "../models/CashTransaction.js";
import { CenterAccount } from "../models/CenterAccount.js";
import "../models/ExpenseCategory.js";
import { FinanceEvent } from "../models/FinanceEvent.js";
import { Group } from "../models/Group.js";
import { JournalEntry } from "../models/JournalEntry.js";
import { Lesson } from "../models/Lesson.js";
import { Student } from "../models/Student.js";
import { Teacher } from "../models/Teacher.js";

type Line = {
  account: string;
  debit?: number;
  credit?: number;
  student?: Types.ObjectId;
  teacher?: Types.ObjectId;
};
type LedgerEvent = {
  date: Date;
  order: number;
  kind: "lesson" | "cash" | "finance";
  data: any;
};

const cashAccount = (method?: string) =>
  !method || method === "cash" ? "cash" : "bank";
const id = (value: unknown) => String(value);

function balanced(lines: Line[]): Line[] {
  for (const line of lines)
    for (const value of [line.debit ?? 0, line.credit ?? 0]) {
      if (!Number.isSafeInteger(value) || value < 0)
        throw new Error("Jurnal summasi musbat butun so‘m bo‘lishi kerak");
    }
  const normalized = lines
    .filter((line) => (line.debit ?? 0) !== 0 || (line.credit ?? 0) !== 0)
    .map((line) => ({
      ...line,
      debit: line.debit ?? 0,
      credit: line.credit ?? 0,
    }));
  const debit = normalized.reduce((sum, line) => sum + (line.debit ?? 0), 0);
  const credit = normalized.reduce((sum, line) => sum + (line.credit ?? 0), 0);
  if (debit !== credit)
    throw new Error(`Jurnal teng emas: debet ${debit}, kredit ${credit}`);
  return normalized;
}

export async function rebuildLedger(): Promise<void> {
  return withFinanceLock(buildLedger);
}

async function buildLedger(): Promise<void> {
  const [lessons, cashTransactions, financeEvents, students, teachers, groups] =
    await Promise.all([
      Lesson.find({ status: "completed" }).lean(),
      CashTransaction.find()
        .populate("expenseCategory", "name code cashFlowType affectsProfit")
        .lean(),
      FinanceEvent.find().lean(),
      Student.find({}, "balance group").lean(),
      Teacher.find({}, "balance salaryPercentage").lean(),
      Group.find().lean(),
    ]);
  const groupMap = new Map(groups.map((group) => [String(group._id), group]));
  const studentMap = new Map(
    students.map((student) => [String(student._id), student]),
  );
  const studentBalance = new Map(
    students.map((student) => [id(student._id), 0]),
  );
  const teacherBalance = new Map(
    teachers.map((teacher) => [id(teacher._id), 0]),
  );
  const teacherPercent = new Map(
    teachers.map((teacher) => [id(teacher._id), teacher.salaryPercentage ?? 0]),
  );
  const events: LedgerEvent[] = [
    ...lessons.map((data) => ({
      date: new Date(data.date),
      order: 1,
      kind: "lesson" as const,
      data,
    })),
    ...financeEvents.map((data) => ({
      date: new Date(data.date),
      order: 2,
      kind: "finance" as const,
      data,
    })),
    ...cashTransactions.map((data) => ({
      date: new Date(data.date),
      order: 3,
      kind: "cash" as const,
      data,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.order - b.order);

  const entries: Array<Record<string, unknown>> = [];
  for (const event of events) {
    if (event.kind === "lesson") {
      const lesson = event.data;
      const group = groupMap.get(String(lesson.group));
      if (!group && !lesson.snapshotVersion)
        throw new Error("Tarixiy dars guruhi topilmadi");
      const studentIds: Types.ObjectId[] = lesson.studentSnapshot?.length
        ? lesson.studentSnapshot
        : (group?.students ?? []);
      const charge =
        lesson.studentCharge ||
        Math.round((group?.coursePrice ?? 0) / (group?.lessonsPerMonth ?? 1));
      const lines: Line[] = [];
      const charges: { student: Types.ObjectId; amount: number }[] =
        lesson.snapshotVersion
          ? lesson.charges
          : studentIds.map((student) => ({ student, amount: charge }));
      for (const { student: studentId, amount: charge } of charges) {
        const key = id(studentId);
        const before = studentBalance.get(key) ?? 0;
        const advanceUsed = Math.min(Math.max(before, 0), charge);
        const receivable = charge - advanceUsed;
        if (advanceUsed)
          lines.push({
            account: "deferred_revenue",
            debit: advanceUsed,
            student: studentId,
          });
        if (receivable)
          lines.push({
            account: "student_receivable",
            debit: receivable,
            student: studentId,
          });
        lines.push({
          account: "course_revenue",
          credit: charge,
          student: studentId,
        });
        studentBalance.set(key, before - charge);
      }
      const totalCharge = charges.reduce((sum, item) => sum + item.amount, 0);
      const teacherId = lesson.teacher as Types.ObjectId;
      const earning =
        lesson.teacherEarning ??
        Math.round(
          (totalCharge * (teacherPercent.get(id(teacherId)) ?? 0)) / 100,
        );
      const teacherBefore = teacherBalance.get(id(teacherId)) ?? 0;
      if (!lesson.snapshotVersion) {
        await Lesson.updateOne(
          { _id: lesson._id },
          {
            $set: {
              snapshotVersion: 1,
              charges,
              studentSnapshot: studentIds,
              groupName: group?.name,
              teacherEarning: earning,
            },
          },
        );
      }
      const advanceRecovery = Math.min(Math.max(-teacherBefore, 0), earning);
      if (earning)
        lines.push({
          account: "salary_expense",
          debit: earning,
          teacher: teacherId,
        });
      if (advanceRecovery)
        lines.push({
          account: "teacher_advance",
          credit: advanceRecovery,
          teacher: teacherId,
        });
      if (earning - advanceRecovery)
        lines.push({
          account: "salary_payable",
          credit: earning - advanceRecovery,
          teacher: teacherId,
        });
      teacherBalance.set(id(teacherId), teacherBefore + earning);
      entries.push({
        date: event.date,
        type: "lesson_completed",
        description: `${lesson.groupName ?? group?.name ?? "Guruh"} guruhi darsi`,
        group: lesson.group,
        teacher: lesson.teacher,
        sourceType: "Lesson",
        sourceId: lesson._id,
        cashFlowCategory: "none",
        lines: balanced(lines),
      });
    } else if (event.kind === "finance") {
      const item = event.data;
      const account = cashAccount(item.paymentMethod);
      let lines: Line[] = [];
      let category = "none";
      if (item.type === "investor_capital") {
        lines = [
          { account, debit: item.amount },
          { account: "investor_capital", credit: item.amount },
        ];
        category = "financing";
      }
      if (item.type === "loan_received") {
        lines = [
          { account, debit: item.amount },
          { account: "loan_payable", credit: item.amount },
        ];
        category = "financing";
      }
      if (item.type === "cash_transfer") {
        lines = [
          { account: "bank", debit: item.amount },
          { account: "cash", credit: item.amount },
        ];
        category = "none";
      }
      if (item.type === "salary_accrual") {
        const teacherId = item.teacher as Types.ObjectId;
        const before = teacherBalance.get(id(teacherId)) ?? 0;
        const recovery = Math.min(Math.max(-before, 0), item.amount);
        lines = [
          { account: "salary_expense", debit: item.amount, teacher: teacherId },
        ];
        if (recovery)
          lines.push({
            account: "teacher_advance",
            credit: recovery,
            teacher: teacherId,
          });
        if (item.amount - recovery)
          lines.push({
            account: "salary_payable",
            credit: item.amount - recovery,
            teacher: teacherId,
          });
        teacherBalance.set(id(teacherId), before + item.amount);
      }
      entries.push({
        date: event.date,
        type: item.type,
        description: item.comment || item.type,
        sourceType: "FinanceEvent",
        teacher: item.teacher,
        paymentMethod:
          item.type === "salary_accrual" ? undefined : item.paymentMethod,
        sourceId: item._id,
        cashFlowCategory: category,
        lines: balanced(lines),
      });
    } else {
      const item = event.data;
      const account = cashAccount(item.paymentMethod);
      let lines: Line[] = [];
      let category = "operating";
      if (item.type === "student_payment") {
        const studentId = item.student as Types.ObjectId;
        const before = studentBalance.get(id(studentId)) ?? 0;
        const receivablePaid = Math.min(Math.max(-before, 0), item.amount);
        const advance = item.amount - receivablePaid;
        lines = [{ account, debit: item.amount }];
        if (receivablePaid)
          lines.push({
            account: "student_receivable",
            credit: receivablePaid,
            student: studentId,
          });
        if (advance)
          lines.push({
            account: "deferred_revenue",
            credit: advance,
            student: studentId,
          });
        studentBalance.set(id(studentId), before + item.amount);
      } else if (item.type === "teacher_salary") {
        const teacherId = item.teacher as Types.ObjectId;
        const before = teacherBalance.get(id(teacherId)) ?? 0;
        const payablePaid = Math.min(Math.max(before, 0), item.amount);
        const advance = item.amount - payablePaid;
        if (payablePaid)
          lines.push({
            account: "salary_payable",
            debit: payablePaid,
            teacher: teacherId,
          });
        if (advance)
          lines.push({
            account: "teacher_advance",
            debit: advance,
            teacher: teacherId,
          });
        lines.push({ account, credit: item.amount });
        teacherBalance.set(id(teacherId), before - item.amount);
      } else {
        const expenseCategory = item.expenseCategory as {
          code?: string;
          cashFlowType?: string;
          affectsProfit?: boolean;
        } | null;
        category = expenseCategory?.cashFlowType ?? "operating";
        const debitAccount =
          expenseCategory?.code === "equipment"
            ? "equipment"
            : expenseCategory?.code === "loan_principal"
              ? "loan_payable"
              : expenseCategory?.code === "loan_interest"
                ? "interest_expense"
                : expenseCategory?.code === "salary"
                  ? "salary_expense"
                  : `expense:${expenseCategory?.code ?? "other"}`;
        lines = [
          { account: debitAccount, debit: item.amount },
          { account, credit: item.amount },
        ];
      }
      entries.push({
        date: event.date,
        type: item.type,
        description: item.comment || item.type,
        sourceType: "CashTransaction",
        student: item.student,
        teacher: item.teacher,
        expenseCategory: item.expenseCategory?._id,
        group:
          item.groupSnapshot ?? studentMap.get(String(item.student))?.group,
        paymentMethod: item.paymentMethod ?? "cash",
        sourceId: item._id,
        cashFlowCategory: category,
        lines: balanced(lines),
      });
    }
  }

  const generation = randomUUID();
  // Remove only the obsolete index definition; existing financial entries are retained.
  const indexes = await JournalEntry.collection.indexes().catch(() => []);
  if (indexes.some((index) => index.name === "sourceType_1_sourceId_1"))
    await JournalEntry.collection.dropIndex("sourceType_1_sourceId_1");
  await JournalEntry.createIndexes();
  if (entries.length)
    await JournalEntry.insertMany(
      entries.map((entry) => ({ ...entry, generation })),
    );
  const daily = new Map<
    string,
    {
      generation: string;
      date: Date;
      account: string;
      cashFlowCategory: string;
      debit: number;
      credit: number;
    }
  >();
  for (const entry of entries)
    for (const line of entry.lines as Line[]) {
      const day = (entry.date as Date).toISOString().slice(0, 10);
      const key = `${day}:${line.account}:${entry.cashFlowCategory}`;
      const row = daily.get(key) ?? {
        generation,
        date: new Date(day + "T00:00:00Z"),
        account: line.account,
        cashFlowCategory: String(entry.cashFlowCategory),
        debit: 0,
        credit: 0,
      };
      row.debit += line.debit ?? 0;
      row.credit += line.credit ?? 0;
      daily.set(key, row);
    }
  if (daily.size) await LedgerDaily.insertMany([...daily.values()]);
  // Publish a complete generation atomically. Reports never see an empty/partial journal.
  await LedgerState.updateOne(
    { key: "active" },
    { $set: { generation } },
    { upsert: true },
  );
  if (students.length)
    await Student.bulkWrite(
      students.map((student) => ({
        updateOne: {
          filter: { _id: student._id },
          update: {
            $set: { balance: studentBalance.get(id(student._id)) ?? 0 },
          },
        },
      })),
    );
  if (teachers.length)
    await Teacher.bulkWrite(
      teachers.map((teacher) => ({
        updateOne: {
          filter: { _id: teacher._id },
          update: {
            $set: { balance: teacherBalance.get(id(teacher._id)) ?? 0 },
          },
        },
      })),
    );

  let cash = 0;
  let bank = 0;
  let revenue = 0;
  let expenses = 0;
  for (const entry of entries)
    for (const line of entry.lines as Line[]) {
      const net = (line.debit ?? 0) - (line.credit ?? 0);
      if (line.account === "cash") cash += net;
      if (line.account === "bank") bank += net;
      if (line.account === "course_revenue")
        revenue += (line.credit ?? 0) - (line.debit ?? 0);
      if (
        line.account === "salary_expense" ||
        line.account === "interest_expense" ||
        line.account.startsWith("expense:")
      )
        expenses += net;
    }
  await CenterAccount.updateOne(
    { key: "main" },
    {
      $set: {
        cashOnHand: cash,
        bankBalance: bank,
        cashBalance: cash + bank,
        earnedProfit: revenue - expenses,
      },
      $setOnInsert: { key: "main" },
    },
    { upsert: true },
  );
}
