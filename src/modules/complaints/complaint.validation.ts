import { z } from "zod";
import { ComplaintCategory, ComplaintPriority, ComplaintStatus } from "./complaint.model";

export const createComplaintSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters.").max(150),
  description: z.string().trim().min(10, "Description must be at least 10 characters.").max(2000),
  category: z.nativeEnum(ComplaintCategory),
  priority: z.nativeEnum(ComplaintPriority).default(ComplaintPriority.MEDIUM),
  block: z.string().trim().max(50).optional(),
  location: z.string().trim().max(150).optional(),
  images: z.array(z.string().url("Each image must be a valid URL.")).max(5).optional().default([]),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const listComplaintsQuerySchema = z.object({
  status: z.nativeEnum(ComplaintStatus).optional(),
  category: z.nativeEnum(ComplaintCategory).optional(),
  priority: z.nativeEnum(ComplaintPriority).optional(),
  hostelId: z.string().optional(),
  departmentId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListComplaintsQuery = z.infer<typeof listComplaintsQuerySchema>;

export const createCommentSchema = z.object({
  text: z.string().trim().min(1, "Comment cannot be empty.").max(1000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateStatusSchema = z
  .object({
    toStatus: z.nativeEnum(ComplaintStatus),
    note: z.string().trim().max(1000).optional(),
    assignedDepartmentId: z.string().min(1).optional(),
    assignedStaffId: z.string().min(1).optional(),
  })
  .refine(
    (data) =>
      data.toStatus !== ComplaintStatus.ASSIGNED ||
      (!!data.assignedDepartmentId && !!data.assignedStaffId),
    {
      message: "assignedDepartmentId and assignedStaffId are required when transitioning to ASSIGNED.",
      path: ["assignedStaffId"],
    }
  );

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const rateComplaintSchema = z.object({
  rating: z.coerce.number().int().min(1, "Rating must be between 1 and 5.").max(5, "Rating must be between 1 and 5."),
});

export type RateComplaintInput = z.infer<typeof rateComplaintSchema>;

export const assignComplaintSchema = z.object({
  departmentId: z.string().min(1, "departmentId is required."),
  staffId: z.string().min(1, "staffId is required."),
  note: z.string().trim().max(1000).optional(),
});

export type AssignComplaintInput = z.infer<typeof assignComplaintSchema>;
