import { Schema, model } from "mongoose";

const cashTransactionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["student_payment", "teacher_salary", "expense"],
      required: true,
    },
    amount: { type: Number, required: true, min: 1 },
    groupSnapshot: { type: Schema.Types.ObjectId, ref: "Group", default: null },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "payme", "click", "bank_transfer"],
      required: true,
    },
    student: { type: Schema.Types.ObjectId, ref: "Student", default: null },
    teacher: { type: Schema.Types.ObjectId, ref: "Teacher", default: null },
    expenseCategory: {
      type: Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      default: null,
    },
    comment: { type: String, default: "", trim: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

cashTransactionSchema.index({ date: -1 });
export const CashTransaction = model("CashTransaction", cashTransactionSchema);
