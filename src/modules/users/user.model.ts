import { HydratedDocument, Schema, Types, model } from "mongoose";

export enum UserRole {
  STUDENT = "STUDENT",
  WARDEN = "WARDEN",
  STAFF = "STAFF",
  ADMIN = "ADMIN",
}

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  hostelId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
    hostelId: { type: Schema.Types.ObjectId, ref: "Hostel" },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department" },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
