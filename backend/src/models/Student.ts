import { Schema, model } from "mongoose";

const studentSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", default: null },
    balance: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true },
);

export const Student = model("Student", studentSchema);
