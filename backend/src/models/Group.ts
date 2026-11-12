import { Schema, model } from "mongoose";

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    time: { type: String, required: true },
    coursePrice: { type: Number, required: true, min: 0 },
    lessonsPerMonth: { type: Number, required: true, min: 1 },
    teacher: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    weekdays: [
      {
        type: String,
        enum: [
          "Dushanba",
          "Seshanba",
          "Chorshanba",
          "Payshanba",
          "Juma",
          "Shanba",
          "Yakshanba",
        ],
      },
    ],
    students: [{ type: Schema.Types.ObjectId, ref: "Student" }],
  },
  { timestamps: true },
);

export const Group = model("Group", groupSchema);
