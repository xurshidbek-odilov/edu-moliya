import { Schema, model } from "mongoose";
const schema = new Schema({
  generation: String,
  date: Date,
  account: String,
  cashFlowCategory: String,
  debit: Number,
  credit: Number,
});
schema.index({ generation: 1, date: 1 });
export const LedgerDaily = model("LedgerDaily", schema);
