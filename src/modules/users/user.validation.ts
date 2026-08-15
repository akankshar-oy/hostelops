import { z } from "zod";
import { UserRole } from "./user.model";

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(72),
    role: z.enum([UserRole.WARDEN, UserRole.STAFF, UserRole.ADMIN]),
    hostelId: z.string().min(1).optional(),
    departmentId: z.string().min(1).optional(),
  })
  .refine((data) => data.role !== UserRole.WARDEN || !!data.hostelId, {
    message: "hostelId is required for WARDEN accounts.",
    path: ["hostelId"],
  })
  .refine((data) => data.role !== UserRole.STAFF || !!data.departmentId, {
    message: "departmentId is required for STAFF accounts.",
    path: ["departmentId"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
