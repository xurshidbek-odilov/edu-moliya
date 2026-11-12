import { Schema, model } from "mongoose";

const centerAccountSchema = new Schema(
  {
    key: { type: String, unique: true, default: "main" },
    earnedProfit: { type: Number, default: 0 },
    cashBalance: { type: Number, default: 0 },
    cashOnHand: { type: Number, default: 0 },
    bankBalance: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const CenterAccount = model("CenterAccount", centerAccountSchema);
