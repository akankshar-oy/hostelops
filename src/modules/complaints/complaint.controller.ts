import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { requireAuth } from "../../utils/requireAuth";
import {
  addComment,
  createComplaint,
  getComplaintById,
  getComplaintHistory,
  listComments,
  listComplaints,
  rateComplaint,
  transitionComplaintStatus,
} from "./complaint.service";
import { listComplaintsQuerySchema } from "./complaint.validation";

function requireParam(value: string | string[] | undefined, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(400, `Missing route parameter: ${name}`);
  }
  return value;
}

export async function createComplaintHandler(req: Request, res: Response): Promise<void> {
  const complaint = await createComplaint(requireAuth(req), req.body);
  res.status(201).json({ complaint });
}

export async function listComplaintsHandler(req: Request, res: Response): Promise<void> {
  const parsedQuery = listComplaintsQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    throw new AppError(400, "Validation failed.", parsedQuery.error.flatten());
  }

  const result = await listComplaints(requireAuth(req), parsedQuery.data);
  res.status(200).json(result);
}

export async function getComplaintHandler(req: Request, res: Response): Promise<void> {
  const complaint = await getComplaintById(requireAuth(req), requireParam(req.params.id, "id"));
  res.status(200).json({ complaint });
}

export async function addCommentHandler(req: Request, res: Response): Promise<void> {
  const comment = await addComment(requireAuth(req), requireParam(req.params.id, "id"), req.body.text);
  res.status(201).json({ comment });
}

export async function listCommentsHandler(req: Request, res: Response): Promise<void> {
  const comments = await listComments(requireAuth(req), requireParam(req.params.id, "id"));
  res.status(200).json({ comments });
}

export async function getComplaintHistoryHandler(req: Request, res: Response): Promise<void> {
  const history = await getComplaintHistory(requireAuth(req), requireParam(req.params.id, "id"));
  res.status(200).json({ history });
}

export async function updateStatusHandler(req: Request, res: Response): Promise<void> {
  const complaint = await transitionComplaintStatus(
    requireAuth(req),
    requireParam(req.params.id, "id"),
    req.body
  );
  res.status(200).json({ complaint });
}

export async function rateComplaintHandler(req: Request, res: Response): Promise<void> {
  const complaint = await rateComplaint(
    requireAuth(req),
    requireParam(req.params.id, "id"),
    req.body.rating
  );
  res.status(200).json({ complaint });
}
