import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  supervisorId: z.string().min(1).optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
