import { Schema, model } from "mongoose";

export interface UserDocument {
  username: string;
  passwordHash: string;
  role: "admin";
}

const userSchema = new Schema<UserDocument>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin" },
  },
  { timestamps: true },
);

export const User = model<UserDocument>("User", userSchema);
