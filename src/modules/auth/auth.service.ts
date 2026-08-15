import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { Hostel } from "../hostels/hostel.model";
import { UserDocument, UserRole } from "../users/user.model";
import { userRepository } from "../users/user.repository";
import { sanitizeUser, SanitizedUser } from "../users/user.service";
import { AppError } from "../../utils/AppError";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import { LoginInput, RegisterInput } from "./auth.validation";

const SALT_ROUNDS = 12;

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: SanitizedUser;
}

function issueTokens(user: UserDocument): AuthResult {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    hostelId: user.hostelId?.toString(),
    departmentId: user.departmentId?.toString(),
  });
  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    tokenVersion: user.tokenVersion,
  });

  return { accessToken, refreshToken, user: sanitizeUser(user) };
}

export async function registerStudent(input: RegisterInput): Promise<AuthResult> {
  if (!Types.ObjectId.isValid(input.hostelId)) {
    throw new AppError(400, "Invalid hostel selected.");
  }

  const [existingUser, hostel] = await Promise.all([
    userRepository.findByEmail(input.email),
    Hostel.findById(input.hostelId),
  ]);

  if (existingUser) {
    throw new AppError(409, "An account with this email already exists.");
  }
  if (!hostel) {
    throw new AppError(400, "Invalid hostel selected.");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await userRepository.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: UserRole.STUDENT,
    hostelId: new Types.ObjectId(input.hostelId),
  });

  return issueTokens(user);
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await userRepository.findByEmail(input.email);
  if (!user) {
    throw new AppError(401, "Invalid email or password.");
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError(401, "Invalid email or password.");
  }

  return issueTokens(user);
}

export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "Invalid or expired refresh token.");
  }

  const user = await userRepository.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.tokenVersion) {
    throw new AppError(401, "Invalid or expired refresh token.");
  }

  const rotatedUser = await userRepository.incrementTokenVersion(user._id.toString());
  if (!rotatedUser) {
    throw new AppError(401, "Invalid or expired refresh token.");
  }

  return issueTokens(rotatedUser);
}

export async function logout(userId: string): Promise<void> {
  await userRepository.incrementTokenVersion(userId);
}
