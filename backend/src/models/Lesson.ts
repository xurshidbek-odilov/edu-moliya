import { Schema, model } from "mongoose";

const lessonSchema = new Schema(
  {
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    teacher: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ["scheduled", "completed"],
      default: "scheduled",
    },
    completedAt: { type: Date, default: null },
    studentCharge: { type: Number, default: 0 },
    totalCharge: { type: Number, default: 0 },
    teacherEarning: { type: Number, default: 0 },
    centerEarning: { type: Number, default: 0 },
    studentSnapshot: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    charges: [
      {
        _id: false,
        student: { type: Schema.Types.ObjectId, ref: "Student" },
        amount: Number,
      },
    ],
    snapshotVersion: Number,
    groupName: String,
    lessonIndex: Number,
  },
  { timestamps: true },
);

lessonSchema.index({ group: 1, date: 1 }, { unique: true });
lessonSchema.index({ date: 1 });

export const Lesson = model("Lesson", lessonSchema);
