import { Types } from "mongoose";
import { AppError } from "../../utils/AppError";
import { AccessTokenPayload } from "../../utils/jwt";
import { UserRole } from "../users/user.model";
import { complaintRepository } from "./complaint.repository";
import { ComplaintDocument, ComplaintStatus } from "./complaint.model";
import { ComplaintComment, ComplaintCommentDocument } from "./complaintComment.model";
import { ComplaintStatusHistory } from "./complaintStatusHistory.model";
import { resolveSLADeadlines } from "./sla.service";
import { CreateComplaintInput, ListComplaintsQuery } from "./complaint.validation";

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function assertHostelLinked(auth: AccessTokenPayload): asserts auth is AccessTokenPayload & { hostelId: string } {
  if (!auth.hostelId) {
    throw new AppError(400, "Your account is not linked to a hostel. Contact your warden.");
  }
}

export async function createComplaint(
  auth: AccessTokenPayload,
  input: CreateComplaintInput
): Promise<ComplaintDocument> {
  assertHostelLinked(auth);

  const now = new Date();
  const { acknowledgeDeadline, resolveDeadline } = await resolveSLADeadlines(
    input.category,
    input.priority,
    now
  );

  const complaint = await complaintRepository.create({
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    hostelId: new Types.ObjectId(auth.hostelId),
    block: input.block ?? null,
    location: input.location ?? null,
    studentId: new Types.ObjectId(auth.sub),
    status: ComplaintStatus.OPEN,
    images: input.images ?? [],
    slaAcknowledgeDeadline: acknowledgeDeadline,
    slaResolveDeadline: resolveDeadline,
  });

  await ComplaintStatusHistory.create({
    complaintId: complaint._id,
    fromStatus: "NONE",
    toStatus: ComplaintStatus.OPEN,
    actorId: complaint.studentId,
    actorRole: UserRole.STUDENT,
    note: "Complaint submitted by student.",
  });

  return complaint;
}

function applyScopeFilter(auth: AccessTokenPayload, filter: Record<string, unknown>): void {
  switch (auth.role) {
    case UserRole.STUDENT:
      filter.studentId = auth.sub;
      break;
    case UserRole.WARDEN:
      assertHostelLinked(auth);
      filter.hostelId = auth.hostelId;
      break;
    case UserRole.STAFF:
      filter.assignedStaffId = auth.sub;
      break;
    case UserRole.ADMIN:
      break;
  }
}

export async function listComplaints(
  auth: AccessTokenPayload,
  query: ListComplaintsQuery
): Promise<{ complaints: ComplaintDocument[]; pagination: Pagination }> {
  const filter: Record<string, unknown> = {};
  applyScopeFilter(auth, filter);

  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.priority) filter.priority = query.priority;
  if (query.departmentId) filter.assignedDepartmentId = query.departmentId;

  if (query.hostelId && auth.role === UserRole.ADMIN) {
    filter.hostelId = query.hostelId;
  }

  const { items, total, page, limit } = await complaintRepository.findMany(
    filter,
    query.page,
    query.limit
  );

  return {
    complaints: items,
    pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getComplaintById(
  auth: AccessTokenPayload,
  id: string
): Promise<ComplaintDocument> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, "Invalid complaint id.");
  }

  const complaint = await complaintRepository.findById(id);
  if (!complaint) {
    throw new AppError(404, "Complaint not found.");
  }

  const canView =
    auth.role === UserRole.ADMIN ||
    (auth.role === UserRole.STUDENT && complaint.studentId.toString() === auth.sub) ||
    (auth.role === UserRole.WARDEN && auth.hostelId === complaint.hostelId.toString()) ||
    (auth.role === UserRole.STAFF && complaint.assignedStaffId?.toString() === auth.sub);

  if (!canView) {
    throw new AppError(403, "You do not have access to this complaint.");
  }

  return complaint;
}

export async function addComment(
  auth: AccessTokenPayload,
  complaintId: string,
  text: string
): Promise<ComplaintCommentDocument> {
  const complaint = await getComplaintById(auth, complaintId);
  return ComplaintComment.create({
    complaintId: complaint._id,
    authorId: new Types.ObjectId(auth.sub),
    text,
  });
}

export async function listComments(
  auth: AccessTokenPayload,
  complaintId: string
): Promise<ComplaintCommentDocument[]> {
  const complaint = await getComplaintById(auth, complaintId);
  return ComplaintComment.find({ complaintId: complaint._id }).sort({ createdAt: 1 });
}

export async function getComplaintHistory(auth: AccessTokenPayload, complaintId: string) {
  const complaint = await getComplaintById(auth, complaintId);
  return ComplaintStatusHistory.find({ complaintId: complaint._id }).sort({ timestamp: 1 });
}
