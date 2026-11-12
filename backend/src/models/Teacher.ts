import { Schema, model } from "mongoose";

const teacherSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    salaryPercentage: { type: Number, required: true, min: 0, max: 100 },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Teacher = model("Teacher", teacherSchema);
