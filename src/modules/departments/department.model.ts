import { HydratedDocument, Schema, Types, model } from "mongoose";

export interface IDepartment {
  name: string;
  supervisorId?: Types.ObjectId;
}

export type DepartmentDocument = HydratedDocument<IDepartment>;

const departmentSchema = new Schema<IDepartment>({
  name: { type: String, required: true },
  supervisorId: { type: Schema.Types.ObjectId, ref: "User" },
});

export const Department = model<IDepartment>("Department", departmentSchema);
