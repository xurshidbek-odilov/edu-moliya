import { withFinanceLock } from "../services/lock.js";
import { reports, activeGeneration } from "../services/reports.js";
import { lessonPrice } from "../services/pricing.js";
import { Router } from "express";
import { ExpenseCategory } from "../models/ExpenseCategory.js";
import { Group } from "../models/Group.js";
import { Student } from "../models/Student.js";
import { Teacher } from "../models/Teacher.js";
import { Lesson } from "../models/Lesson.js";
import { CashTransaction } from "../models/CashTransaction.js";
import { CenterAccount } from "../models/CenterAccount.js";
import { FinanceEvent } from "../models/FinanceEvent.js";
import { JournalEntry } from "../models/JournalEntry.js";
import { rebuildLedger } from "../services/ledger.js";

export const crmRouter = Router();
crmRouter.use(async (req, res, next) => {
  if (req.method === "GET" && req.path !== "/lessons") return next();
  try {
    await withFinanceLock(async () => {
      await new Promise<void>((resolve) => {
        res.once("finish", resolve);
        res.once("close", resolve);
        next();
      });
    });
  } catch (error) {
    next(error);
  }
});

crmRouter.get("/dashboard", async (req, res) => {
  const month = req.query.month;
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    return res.status(400).json({ message: "Oyni YYYY-MM formatida kiriting" });
  const [year, number] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, number - 1, 1));
  const end = new Date(Date.UTC(year, number, 1));
  const [teachers, students, groups, expenseCategories] = await Promise.all([
    Teacher.countDocuments(),
    Student.countDocuments(),
    Group.countDocuments(),
    ExpenseCategory.countDocuments(),
  ]);
  const generation = await activeGeneration();
  const [journal, lessons, debtors, debtTotals, teacherTotals, recent] =
    await Promise.all([
      JournalEntry.find({ generation, date: { $lt: end } }).lean(),
      Lesson.find({ date: { $gte: start, $lt: end } })
        .populate("group", "name")
        .populate("teacher", "firstName lastName")
        .sort({ date: 1, time: 1 })
        .lean(),
      Student.find({ balance: { $lt: 0 } }, "firstName lastName balance")
        .sort({ balance: 1 })
        .limit(5)
        .lean(),
      Student.aggregate([
        {
          $group: {
            _id: null,
            debt: {
              $sum: {
                $max: [{ $multiply: [{ $ifNull: ["$balance", 0] }, -1] }, 0],
              },
            },
            advances: { $sum: { $max: [{ $ifNull: ["$balance", 0] }, 0] } },
            debtors: { $sum: { $cond: [{ $lt: ["$balance", 0] }, 1, 0] } },
          },
        },
      ]),
      Teacher.aggregate([
        {
          $group: {
            _id: null,
            payable: { $sum: { $max: [{ $ifNull: ["$balance", 0] }, 0] } },
          },
        },
      ]),
      JournalEntry.find({ generation, date: { $gte: start, $lt: end } })
        .sort({ date: -1, _id: -1 })
        .limit(8)
        .lean(),
    ]);
  let revenue = 0,
    expenses = 0,
    inflow = 0,
    outflow = 0,
    cash = 0,
    bank = 0;
  const daily = Array.from(
    { length: new Date(Date.UTC(year, number, 0)).getUTCDate() },
    (_, index) => ({ day: index + 1, inflow: 0, outflow: 0 }),
  );
  for (const entry of journal) {
    for (const line of entry.lines) {
      const net = line.debit - line.credit;
      if (line.account === "cash") cash += net;
      if (line.account === "bank") bank += net;
      if (entry.date < start) continue;
      if (line.account === "course_revenue") revenue -= net;
      if (
        ["salary_expense", "interest_expense"].includes(line.account) ||
        line.account.startsWith("expense:")
      )
        expenses += net;
      if (
        ["cash", "bank"].includes(line.account) &&
        entry.cashFlowCategory !== "none"
      ) {
        inflow += line.debit;
        outflow += line.credit;
        daily[entry.date.getUTCDate() - 1].inflow += line.debit;
        daily[entry.date.getUTCDate() - 1].outflow += line.credit;
      }
    }
  }
  res.json({
    teachers,
    students,
    groups,
    expenseCategories,
    month,
    finance: {
      revenue,
      expenses,
      profit: revenue - expenses,
      inflow,
      outflow,
      cash,
      bank,
    },
    daily,
    current: {
      debt: debtTotals[0]?.debt ?? 0,
      advances: debtTotals[0]?.advances ?? 0,
      debtors: debtTotals[0]?.debtors ?? 0,
      payable: teacherTotals[0]?.payable ?? 0,
    },
    debtors,
    lessons: {
      total: lessons.length,
      completed: lessons.filter((item) => item.status === "completed").length,
      scheduled: lessons
        .filter((item) => item.status === "scheduled")
        .slice(0, 6),
    },
    recent: recent.map((entry) => ({
      id: entry._id,
      date: entry.date,
      type: entry.type,
      description: entry.description,
      amount: entry.lines.reduce((sum, line) => sum + line.debit, 0),
    })),
  });
});

crmRouter.get("/teachers", async (_req, res) =>
  res.json(await Teacher.find().sort({ createdAt: -1 })),
);
crmRouter.post("/teachers", async (req, res) =>
  res.status(201).json(await Teacher.create(req.body)),
);
crmRouter.put("/teachers/:id", async (req, res) =>
  res.json(
    await Teacher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }),
  ),
);
crmRouter.delete("/teachers/:id", async (req, res) => {
  const used =
    (await Group.exists({ teacher: req.params.id })) ||
    (await Lesson.exists({ teacher: req.params.id, status: "completed" })) ||
    (await FinanceEvent.exists({ teacher: req.params.id })) ||
    (await CashTransaction.exists({ teacher: req.params.id }));
  if (used)
    return res
      .status(409)
      .json({ message: "O‘qituvchi guruhga biriktirilgan" });
  await Teacher.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

crmRouter.get("/students", async (_req, res) =>
  res.json(
    await Student.find().populate("group", "name").sort({ createdAt: -1 }),
  ),
);
const studentFields = (body: any) => ({
  firstName: body.firstName,
  lastName: body.lastName,
  phone: body.phone,
  discountPercentage: body.discountPercentage ?? 0,
  group: body.group || null,
});
async function syncRoster() {
  const students = await Student.find({}, "group").lean();
  const groups = await Group.find({}, "_id").lean();
  if (groups.length)
    await Group.bulkWrite(
      groups.map((group) => ({
        updateOne: {
          filter: { _id: group._id },
          update: {
            $set: {
              students: students
                .filter(
                  (student) => String(student.group) === String(group._id),
                )
                .map((student) => student._id),
            },
          },
        },
      })),
    );
}
crmRouter.post("/students", async (req, res) => {
  if (req.body.group && !(await Group.exists({ _id: req.body.group })))
    return res.status(400).json({ message: "Guruh topilmadi" });
  const student = await Student.create(studentFields(req.body));
  await syncRoster();
  res.status(201).json(student);
});
crmRouter.put("/students/:id", async (req, res) => {
  if (req.body.group && !(await Group.exists({ _id: req.body.group })))
    return res.status(400).json({ message: "Guruh topilmadi" });
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    studentFields(req.body),
    { new: true, runValidators: true },
  );
  await syncRoster();
  res.json(student);
});
crmRouter.delete("/students/:id", async (req, res) => {
  if (
    (await CashTransaction.exists({ student: req.params.id })) ||
    (await Lesson.exists({
      studentSnapshot: req.params.id,
      status: "completed",
    }))
  )
    return res
      .status(409)
      .json({ message: "Moliyaviy tarixi bor o‘quvchini o‘chirib bo‘lmaydi" });
  await Group.updateMany({}, { $pull: { students: req.params.id } });
  await Student.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

crmRouter.get("/groups", async (_req, res) =>
  res.json(
    await Group.find()
      .populate("teacher", "firstName lastName")
      .populate("students", "firstName lastName phone")
      .sort({ createdAt: -1 }),
  ),
);
crmRouter.post("/groups", async (req, res) => {
  const group = await Group.create(req.body);
  await Student.updateMany(
    { _id: { $in: group.students } },
    { group: group._id },
  );
  await syncRoster();
  res.status(201).json(group);
});
crmRouter.put("/groups/:id", async (req, res) => {
  const previous = await Group.findById(req.params.id);
  const group = await Group.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (group)
    await Student.updateMany({ group: req.params.id }, { group: null });
  if (group)
    await Student.updateMany(
      { _id: { $in: group.students } },
      { group: group._id },
    );
  await syncRoster();
  res.json(group ?? previous);
});
crmRouter.delete("/groups/:id", async (req, res) => {
  if (await Lesson.exists({ group: req.params.id, status: "completed" }))
    return res
      .status(409)
      .json({ message: "O‘tilgan darslari bor guruhni o‘chirib bo‘lmaydi" });
  await Student.updateMany({ group: req.params.id }, { group: null });
  await Lesson.deleteMany({ group: req.params.id });
  await Group.findByIdAndDelete(req.params.id);
  await rebuildLedger();
  res.status(204).end();
});

const weekdayNumbers: Record<string, number> = {
  Yakshanba: 0,
  Dushanba: 1,
  Seshanba: 2,
  Chorshanba: 3,
  Payshanba: 4,
  Juma: 5,
  Shanba: 6,
};

crmRouter.get("/lessons", async (req, res) => {
  const month =
    typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const groups = await Group.find();

  for (const group of groups) {
    const allowedDays = new Set(
      group.weekdays.map((day) => weekdayNumbers[day]),
    );
    const dates: Date[] = [];
    for (
      let date = new Date(start);
      date < end && dates.length < group.lessonsPerMonth;
      date.setUTCDate(date.getUTCDate() + 1)
    ) {
      if (allowedDays.has(date.getUTCDay())) dates.push(new Date(date));
    }
    await Promise.all(
      dates.map((date) =>
        Lesson.updateOne(
          { group: group._id, date },
          {
            $setOnInsert: {
              group: group._id,
              date,
              status: "scheduled",
              teacher: group.teacher,
              time: group.time,
            },
          },
          { upsert: true },
        ),
      ),
    );
  }

  const lessons = await Lesson.find({ date: { $gte: start, $lt: end } })
    .populate("group", "name coursePrice")
    .populate("teacher", "firstName lastName")
    .sort({ date: 1, time: 1 });
  res.json(lessons);
});

crmRouter.patch("/lessons/:id/complete", async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) return res.status(404).json({ message: "Dars topilmadi" });
  if (lesson.status === "completed") return res.json(lesson);

  const group = await Group.findById(lesson.group);
  const teacher = await Teacher.findById(lesson.teacher);
  if (!group || !teacher)
    return res.status(409).json({ message: "Guruh yoki o‘qituvchi topilmadi" });

  const roster = await Student.find({ group: group._id });
  const monthStart = new Date(
    Date.UTC(lesson.date.getUTCFullYear(), lesson.date.getUTCMonth(), 1),
  );
  const index = await Lesson.countDocuments({
    group: group._id,
    date: { $gte: monthStart, $lt: lesson.date },
  });
  if (index >= group.lessonsPerMonth)
    return res.status(400).json({ message: "Oylik darslar limitidan oshgan" });
  lesson.set(
    "charges",
    roster.map((student) => ({
      student: student._id,
      amount: lessonPrice(
        group.coursePrice,
        student.discountPercentage ?? 0,
        group.lessonsPerMonth,
        index,
      ),
    })),
  );
  const totalCharge = lesson.charges.reduce(
    (sum, charge) => sum + (charge.amount ?? 0),
    0,
  );
  lesson.status = "completed";
  lesson.completedAt = new Date();
  lesson.studentCharge = lessonPrice(
    group.coursePrice,
    0,
    group.lessonsPerMonth,
    index,
  );
  lesson.totalCharge = totalCharge;
  lesson.teacherEarning = Math.round(
    (totalCharge * teacher.salaryPercentage) / 100,
  );
  lesson.centerEarning = totalCharge - lesson.teacherEarning;
  lesson.studentSnapshot = roster.map((student) => student._id);
  lesson.snapshotVersion = 1;
  lesson.groupName = group.name;
  lesson.lessonIndex = index;
  await lesson.save();
  await rebuildLedger();
  res.json(lesson);
});

crmRouter.get("/cash", async (_req, res) => {
  const [transactions, account] = await Promise.all([
    CashTransaction.find()
      .populate("student", "firstName lastName")
      .populate("teacher", "firstName lastName")
      .populate("expenseCategory", "name")
      .sort({ date: -1 })
      .limit(100),
    CenterAccount.findOne({ key: "main" }),
  ]);
  res.json({
    transactions,
    account: account ?? {
      earnedProfit: 0,
      cashBalance: 0,
      cashOnHand: 0,
      bankBalance: 0,
    },
  });
});

type PaymentMethod = "cash" | "card" | "payme" | "click" | "bank_transfer";
const paymentMethods = new Set<PaymentMethod>([
  "cash",
  "card",
  "payme",
  "click",
  "bank_transfer",
]);
function paymentBalanceInc(
  paymentMethod: PaymentMethod,
  amount: number,
): Record<string, number> {
  return paymentMethod === "cash"
    ? { cashBalance: amount, cashOnHand: amount }
    : { cashBalance: amount, bankBalance: amount };
}
function negateBalanceInc(values: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, -value]),
  );
}

crmRouter.post("/cash/student-payment", async (req, res) => {
  const {
    studentId,
    amount,
    comment = "",
    paymentMethod,
    date,
  } = req.body as {
    studentId?: string;
    amount?: number;
    comment?: string;
    paymentMethod?: PaymentMethod;
    date?: string;
  };
  if (
    !studentId ||
    !Number.isSafeInteger(amount) ||
    !amount ||
    amount <= 0 ||
    !paymentMethod ||
    !paymentMethods.has(paymentMethod)
  )
    return res
      .status(400)
      .json({ message: "O‘quvchi, summa va to‘lov turini kiriting" });
  const student = await Student.findById(studentId);
  if (!student) return res.status(404).json({ message: "O‘quvchi topilmadi" });
  const transaction = await CashTransaction.create({
    type: "student_payment",
    amount,
    student: studentId,
    groupSnapshot: student.group,
    comment,
    paymentMethod,
    date: date ? new Date(`${date}T12:00:00.000Z`) : new Date(),
  });
  await rebuildLedger();
  res
    .status(201)
    .json({
      transaction,
      balance: (await Student.findById(studentId))?.balance ?? 0,
    });
});

crmRouter.post("/cash/teacher-salary", async (req, res) => {
  const {
    teacherId,
    amount,
    comment = "",
    paymentMethod,
    date,
  } = req.body as {
    teacherId?: string;
    amount?: number;
    comment?: string;
    paymentMethod?: PaymentMethod;
    date?: string;
  };
  if (
    !teacherId ||
    !Number.isSafeInteger(amount) ||
    !amount ||
    amount <= 0 ||
    !paymentMethod ||
    !paymentMethods.has(paymentMethod)
  )
    return res
      .status(400)
      .json({ message: "O‘qituvchi, summa va to‘lov turini kiriting" });
  const teacher = await Teacher.findById(teacherId);
  if (!teacher)
    return res.status(404).json({ message: "O‘qituvchi topilmadi" });
  const transaction = await CashTransaction.create({
    type: "teacher_salary",
    amount,
    teacher: teacherId,
    comment,
    paymentMethod,
    date: date ? new Date(`${date}T12:00:00.000Z`) : new Date(),
  });
  await rebuildLedger();
  res
    .status(201)
    .json({
      transaction,
      balance: (await Teacher.findById(teacherId))?.balance ?? 0,
    });
});

crmRouter.post("/cash/expense", async (req, res) => {
  const {
    expenseCategoryId,
    amount,
    comment = "",
    paymentMethod,
    date,
  } = req.body as {
    expenseCategoryId?: string;
    amount?: number;
    comment?: string;
    paymentMethod?: PaymentMethod;
    date?: string;
  };
  if (
    !expenseCategoryId ||
    !Number.isSafeInteger(amount) ||
    !amount ||
    amount <= 0 ||
    !paymentMethod ||
    !paymentMethods.has(paymentMethod)
  )
    return res
      .status(400)
      .json({ message: "Xarajat asosi, summa va to‘lov turini kiriting" });
  const category = await ExpenseCategory.findById(expenseCategoryId);
  if (!category)
    return res.status(404).json({ message: "Xarajat asosi topilmadi" });
  const transaction = await CashTransaction.create({
    type: "expense",
    amount,
    expenseCategory: expenseCategoryId,
    comment,
    paymentMethod,
    date: date ? new Date(`${date}T12:00:00.000Z`) : new Date(),
  });
  await rebuildLedger();
  res.status(201).json(transaction);
});

crmRouter.put("/cash/:id", async (req, res) => {
  const transaction = await CashTransaction.findById(req.params.id);
  if (!transaction)
    return res.status(404).json({ message: "Kassa operatsiyasi topilmadi" });
  const {
    amount,
    comment = "",
    paymentMethod,
    studentId,
    teacherId,
    expenseCategoryId,
    date,
  } = req.body as {
    amount?: number;
    comment?: string;
    paymentMethod?: PaymentMethod;
    studentId?: string;
    teacherId?: string;
    expenseCategoryId?: string;
    date?: string;
  };
  if (
    !Number.isSafeInteger(amount) ||
    !amount ||
    amount <= 0 ||
    !paymentMethod ||
    !paymentMethods.has(paymentMethod)
  )
    return res
      .status(400)
      .json({ message: "Musbat summa va to‘lov turini kiriting" });
  if (
    transaction.type === "student_payment" &&
    (!studentId || !(await Student.exists({ _id: studentId })))
  )
    return res.status(404).json({ message: "O‘quvchi topilmadi" });
  if (
    transaction.type === "teacher_salary" &&
    (!teacherId || !(await Teacher.exists({ _id: teacherId })))
  )
    return res.status(404).json({ message: "O‘qituvchi topilmadi" });
  if (
    transaction.type === "expense" &&
    (!expenseCategoryId ||
      !(await ExpenseCategory.exists({ _id: expenseCategoryId })))
  )
    return res.status(404).json({ message: "Xarajat asosi topilmadi" });

  if (transaction.type === "student_payment") {
    transaction.student = studentId as never;
    transaction.groupSnapshot = (await Student.findById(studentId))?.group;
  } else if (transaction.type === "teacher_salary")
    transaction.teacher = teacherId as never;
  else transaction.expenseCategory = expenseCategoryId as never;
  transaction.amount = amount;
  transaction.comment = comment;
  transaction.paymentMethod = paymentMethod;
  if (date) transaction.date = new Date(`${date}T12:00:00.000Z`);
  await transaction.save();
  await rebuildLedger();
  res.json(transaction);
});

crmRouter.get("/finance-events", async (_req, res) => {
  res.json(
    await FinanceEvent.find()
      .populate("teacher", "firstName lastName")
      .sort({ date: -1 }),
  );
});

crmRouter.post("/finance-events", async (req, res) => {
  const {
    type,
    date,
    amount,
    paymentMethod = "bank_transfer",
    teacherId,
    investorName = "",
    annualInterestRate = 0,
    comment = "",
  } = req.body as {
    type?: string;
    date?: string;
    amount?: number;
    paymentMethod?: string;
    teacherId?: string;
    investorName?: string;
    annualInterestRate?: number;
    comment?: string;
  };
  if (
    !type ||
    ![
      "investor_capital",
      "loan_received",
      "salary_accrual",
      "cash_transfer",
    ].includes(type) ||
    !date ||
    !Number.isSafeInteger(amount) ||
    !amount ||
    amount <= 0
  )
    return res
      .status(400)
      .json({ message: "Hodisa turi, sana va musbat summa kerak" });
  if (
    type === "salary_accrual" &&
    (!teacherId || !(await Teacher.exists({ _id: teacherId })))
  )
    return res.status(400).json({ message: "O‘qituvchini tanlang" });
  const event = await FinanceEvent.create({
    type,
    date: new Date(`${date}T12:00:00.000Z`),
    amount,
    paymentMethod,
    teacher: type === "salary_accrual" ? teacherId : null,
    investorName,
    annualInterestRate,
    comment,
  });
  await rebuildLedger();
  res.status(201).json(event);
});

crmRouter.delete("/finance-events/:id", async (req, res) => {
  const event = await FinanceEvent.findByIdAndDelete(req.params.id);
  if (!event)
    return res.status(404).json({ message: "Moliyaviy hodisa topilmadi" });
  await rebuildLedger();
  res.status(204).end();
});

function reportDates(query: Record<string, unknown>) {
  if (query.date) query = { ...query, to: query.date };
  if (query.month) {
    if (
      typeof query.month !== "string" ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month)
    )
      throw new Error("Oy formati YYYY-MM");
    const [y, m] = query.month.split("-").map(Number);
    return {
      from: new Date(Date.UTC(y, m - 1, 1)),
      to: new Date(Date.UTC(y, m, 1) - 1),
    };
  }
  return {
    from: new Date(String(query.from ?? "2000-01-01") + "T00:00:00Z"),
    to: new Date(
      String(query.to ?? new Date().toISOString().slice(0, 10)) +
        "T23:59:59.999Z",
    ),
  };
}
for (const [path, field] of [
  ["profit-loss", "profitLoss"],
  ["cash-flow", "cashFlow"],
  ["balance", "balance"],
] as const) {
  crmRouter.get("/reports/" + path, async (req, res) => {
    const { from, to } = reportDates(req.query);
    res.json((await reports(from, to))[field]);
  });
}
crmRouter.get("/reports", async (req, res) => {
  const { from, to } = reportDates(req.query);
  const generation = await activeGeneration();
  const match: Record<string, unknown> = {
    generation,
    date: { $gte: from, $lte: to },
  };
  for (const [query, field] of [
    ["type", "type"],
    ["paymentMethod", "paymentMethod"],
    ["studentId", "student"],
    ["teacherId", "teacher"],
    ["categoryId", "expenseCategory"],
    ["groupId", "group"],
  ]) {
    if (req.query[query]) match[field] = req.query[query];
  }
  const [financial, activity] = await Promise.all([
    reports(from, to),
    JournalEntry.find(match).sort({ date: -1, _id: -1 }).limit(200).lean(),
  ]);
  const cashIds = activity
    .filter((row) => row.sourceType === "CashTransaction")
    .map((row) => row.sourceId);
  const [transactions, financeEvents] = await Promise.all([
    CashTransaction.find({ _id: { $in: cashIds } })
      .populate("student", "firstName lastName")
      .populate("teacher", "firstName lastName")
      .populate("expenseCategory", "name")
      .sort({ date: -1 }),
    FinanceEvent.find({
      _id: {
        $in: activity
          .filter((row) => row.sourceType === "FinanceEvent")
          .map((row) => row.sourceId),
      },
    }).populate("teacher", "firstName lastName"),
  ]);
  res.json({
    ...financial,
    transactions,
    financeEvents,
    lessons: [],
    activity,
    filterScope: "activity",
    detailLimit: 200,
  });
});

crmRouter.get("/expense-categories", async (_req, res) =>
  res.json(await ExpenseCategory.find().sort({ name: 1 })),
);
crmRouter.post("/expense-categories", async (req, res) => {
  const { name, description = "" } = req.body as {
    name?: string;
    description?: string;
  };
  if (!name?.trim())
    return res.status(400).json({ message: "Xarajat nomini kiriting" });
  const item = await ExpenseCategory.create({
    name: name.trim(),
    description: description.trim(),
    code: `custom_${Date.now()}`,
    cashFlowType: "operating",
    affectsProfit: true,
  });
  res.status(201).json(item);
});
crmRouter.put("/expense-categories/:id", async (req, res) => {
  const { name, description = "" } = req.body as {
    name?: string;
    description?: string;
  };
  if (!name?.trim())
    return res.status(400).json({ message: "Xarajat nomini kiriting" });
  const item = await ExpenseCategory.findByIdAndUpdate(
    req.params.id,
    { name: name.trim(), description: description.trim() },
    { new: true, runValidators: true },
  );
  if (!item)
    return res.status(404).json({ message: "Xarajat asosi topilmadi" });
  res.json(item);
});
crmRouter.delete("/expense-categories/:id", async (req, res) => {
  if (await CashTransaction.exists({ expenseCategory: req.params.id }))
    return res
      .status(409)
      .json({ message: "Ishlatilgan xarajat asosini o‘chirib bo‘lmaydi" });
  const item = await ExpenseCategory.findByIdAndDelete(req.params.id);
  if (!item)
    return res.status(404).json({ message: "Xarajat asosi topilmadi" });
  res.status(204).end();
});
