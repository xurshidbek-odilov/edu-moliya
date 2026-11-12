import { Schema, model } from "mongoose";

const financeEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "investor_capital",
        "loan_received",
        "salary_accrual",
        "cash_transfer",
      ],
      required: true,
    },
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 1 },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer"],
      default: "bank_transfer",
    },
    teacher: { type: Schema.Types.ObjectId, ref: "Teacher", default: null },
    investorName: { type: String, default: "", trim: true },
    annualInterestRate: { type: Number, default: 0, min: 0 },
    comment: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

financeEventSchema.index({ date: 1 });
export const FinanceEvent = model("FinanceEvent", financeEventSchema);
