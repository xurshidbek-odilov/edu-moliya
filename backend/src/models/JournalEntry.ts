import { Schema, model } from "mongoose";

const journalLineSchema = new Schema(
  {
    account: { type: String, required: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    student: { type: Schema.Types.ObjectId, ref: "Student", default: null },
    teacher: { type: Schema.Types.ObjectId, ref: "Teacher", default: null },
  },
  { _id: false },
);

const journalEntrySchema = new Schema(
  {
    date: { type: Date, required: true, index: true },
    generation: { type: String, default: "legacy" },
    group: { type: Schema.Types.ObjectId, ref: "Group", default: null },
    paymentMethod: String,
    student: { type: Schema.Types.ObjectId, ref: "Student", default: null },
    teacher: { type: Schema.Types.ObjectId, ref: "Teacher", default: null },
    expenseCategory: {
      type: Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      default: null,
    },
    type: { type: String, required: true },
    description: { type: String, required: true },
    sourceType: { type: String, required: true },
    sourceId: { type: Schema.Types.ObjectId, required: true },
    cashFlowCategory: {
      type: String,
      enum: ["operating", "investing", "financing", "none"],
      default: "none",
    },
    lines: { type: [journalLineSchema], required: true },
  },
  { timestamps: true },
);

journalEntrySchema.index(
  { generation: 1, sourceType: 1, sourceId: 1 },
  { unique: true },
);
journalEntrySchema.index({ generation: 1, date: 1 });
export const JournalEntry = model("JournalEntry", journalEntrySchema);
