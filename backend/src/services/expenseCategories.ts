import { ExpenseCategory } from "../models/ExpenseCategory.js";

const defaults = [
  {
    name: "Ish haqi",
    code: "salary",
    cashFlowType: "operating",
    affectsProfit: true,
    description: "Xodimlarning hisoblangan ish haqi",
  },
  {
    name: "Ijara",
    code: "rent",
    cashFlowType: "operating",
    affectsProfit: true,
    description: "Bino va xona ijarasi",
  },
  {
    name: "Elektr energiyasi",
    code: "electricity",
    cashFlowType: "operating",
    affectsProfit: true,
    description: "Elektr to‘lovi",
  },
  {
    name: "Kommunal xizmatlar",
    code: "utilities",
    cashFlowType: "operating",
    affectsProfit: true,
    description: "Suv, gaz, internet va boshqa kommunal to‘lovlar",
  },
  {
    name: "Marketing va reklama",
    code: "marketing",
    cashFlowType: "operating",
    affectsProfit: true,
    description: "Reklama va marketing xarajatlari",
  },
  {
    name: "Kredit foizi",
    code: "loan_interest",
    cashFlowType: "operating",
    affectsProfit: true,
    description: "Kredit to‘lovining foiz qismi",
  },
  {
    name: "Kredit asosiy qarzi",
    code: "loan_principal",
    cashFlowType: "financing",
    affectsProfit: false,
    description: "Kreditning asosiy qarzini qaytarish",
  },
  {
    name: "Jihoz va mebel",
    code: "equipment",
    cashFlowType: "investing",
    affectsProfit: false,
    description: "Asosiy vosita xaridi",
  },
] as const;

export async function ensureExpenseCategories(): Promise<void> {
  await Promise.all(
    defaults.map((item) =>
      ExpenseCategory.updateOne(
        { code: item.code },
        { $setOnInsert: item },
        { upsert: true },
      ),
    ),
  );
}
