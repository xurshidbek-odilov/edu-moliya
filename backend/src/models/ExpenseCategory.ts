import { Schema, model } from "mongoose";

const expenseCategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    cashFlowType: {
      type: String,
      enum: ["operating", "investing", "financing"],
      required: true,
    },
    affectsProfit: { type: Boolean, required: true },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

export const ExpenseCategory = model("ExpenseCategory", expenseCategorySchema);
