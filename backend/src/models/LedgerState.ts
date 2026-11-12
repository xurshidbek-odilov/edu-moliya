import { Schema, model } from "mongoose";
export const LedgerState = model(
  "LedgerState",
  new Schema({ key: { type: String, unique: true }, generation: String }),
);
