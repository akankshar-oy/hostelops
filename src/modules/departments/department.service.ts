import { Types } from "mongoose";
import { AppError } from "../../utils/AppError";
import { User, UserDocument, UserRole } from "../users/user.model";
import { Department, DepartmentDocument } from "./department.model";
import { CreateDepartmentInput } from "./department.validation";

export async function createDepartment(input: CreateDepartmentInput): Promise<DepartmentDocument> {
  if (input.supervisorId) {
    if (!Types.ObjectId.isValid(input.supervisorId)) {
      throw new AppError(400, "Invalid supervisor id.");
    }
    const supervisor = await User.findById(input.supervisorId);
    if (!supervisor || supervisor.role !== UserRole.STAFF) {
      throw new AppError(400, "Supervisor must be an existing staff member.");
    }
  }

  return Department.create({
    name: input.name,
    supervisorId: input.supervisorId ? new Types.ObjectId(input.supervisorId) : undefined,
  });
}

export function listDepartments(): Promise<DepartmentDocument[]> {
  return Department.find().sort({ name: 1 });
}

export async function listDepartmentStaff(departmentId: string): Promise<UserDocument[]> {
  if (!Types.ObjectId.isValid(departmentId)) {
    throw new AppError(400, "Invalid department id.");
  }

  const department = await Department.findById(departmentId);
  if (!department) {
    throw new AppError(404, "Department not found.");
  }

  return User.find({ departmentId: department._id, role: UserRole.STAFF }).select("-passwordHash");
}
