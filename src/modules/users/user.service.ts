import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { AppError } from "../../utils/AppError";
import { Department } from "../departments/department.model";
import { Hostel } from "../hostels/hostel.model";
import { UserDocument, UserRole } from "./user.model";
import { userRepository } from "./user.repository";
import { CreateUserInput } from "./user.validation";

const SALT_ROUNDS = 12;

export interface SanitizedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hostelId: string | null;
  departmentId: string | null;
}

export function sanitizeUser(user: UserDocument): SanitizedUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    hostelId: user.hostelId ? user.hostelId.toString() : null,
    departmentId: user.departmentId ? user.departmentId.toString() : null,
  };
}

export async function createUserByAdmin(input: CreateUserInput): Promise<SanitizedUser> {
  const existing = await userRepository.findByEmail(input.email);
  if (existing) {
    throw new AppError(409, "An account with this email already exists.");
  }

  if (input.hostelId) {
    if (!Types.ObjectId.isValid(input.hostelId)) {
      throw new AppError(400, "Invalid hostel selected.");
    }
    const hostel = await Hostel.findById(input.hostelId);
    if (!hostel) {
      throw new AppError(400, "Invalid hostel selected.");
    }
  }

  if (input.departmentId) {
    if (!Types.ObjectId.isValid(input.departmentId)) {
      throw new AppError(400, "Invalid department selected.");
    }
    const department = await Department.findById(input.departmentId);
    if (!department) {
      throw new AppError(400, "Invalid department selected.");
    }
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await userRepository.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    hostelId: input.hostelId ? new Types.ObjectId(input.hostelId) : undefined,
    departmentId: input.departmentId ? new Types.ObjectId(input.departmentId) : undefined,
  });

  return sanitizeUser(user);
}
