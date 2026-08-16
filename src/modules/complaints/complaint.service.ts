import { Types } from "mongoose";
import { AppError } from "../../utils/AppError";
import { AccessTokenPayload } from "../../utils/jwt";
import { Department, DepartmentDocument } from "../departments/department.model";
import { User, UserDocument, UserRole } from "../users/user.model";
import { complaintRepository } from "./complaint.repository";
import { ComplaintDocument, ComplaintStatus } from "./complaint.model";
import { ComplaintComment, ComplaintCommentDocument } from "./complaintComment.model";
import { ComplaintStatusHistory } from "./complaintStatusHistory.model";
import {
  notifyComplaintAcknowledged,
  notifyComplaintAssigned,
  notifyComplaintReassigned,
  notifyComplaintReopened,
  notifyComplaintStatusChanged,
  notifyComplaintSubmitted,
} from "./complaintNotifier";
import { getTransitionRule } from "./complaint.stateMachine";
import { applyEscalation, resolveNextEscalationLevel } from "./escalation.service";
import { resolveSLADeadlines } from "./sla.service";
import {
  AssignComplaintInput,
  CreateComplaintInput,
  EscalateComplaintInput,
  ListComplaintsQuery,
  UpdateStatusInput,
} from "./complaint.validation";

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

async function validateAssignmentTarget(
  departmentId: string,
  staffId: string
): Promise<{ department: DepartmentDocument; staff: UserDocument }> {
  if (!Types.ObjectId.isValid(departmentId) || !Types.ObjectId.isValid(staffId)) {
    throw new AppError(400, "Invalid department or staff id.");
  }

  const [department, staff] = await Promise.all([
    Department.findById(departmentId),
    User.findById(staffId),
  ]);

  if (!department) {
    throw new AppError(400, "Invalid department selected.");
  }
  if (!staff || staff.role !== UserRole.STAFF) {
    throw new AppError(400, "Invalid staff member selected.");
  }
  if (staff.departmentId?.toString() !== department._id.toString()) {
    throw new AppError(400, "Selected staff member does not belong to the selected department.");
  }

  return { department, staff };
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

  await notifyComplaintSubmitted(complaint);

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

  let finalFilter: Record<string, unknown> = filter;
  if (query.overdue) {
    const now = new Date();
    finalFilter = {
      $and: [
        filter,
        {
          $or: [
            { status: ComplaintStatus.OPEN, slaAcknowledgeDeadline: { $lt: now } },
            {
              status: { $nin: [ComplaintStatus.OPEN, ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] },
              slaResolveDeadline: { $lt: now },
            },
          ],
        },
      ],
    };
  }

  const { items, total, page, limit } = await complaintRepository.findMany(
    finalFilter,
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

export async function transitionComplaintStatus(
  auth: AccessTokenPayload,
  complaintId: string,
  input: UpdateStatusInput
): Promise<ComplaintDocument> {
  const complaint = await getComplaintById(auth, complaintId);

  const rule = getTransitionRule(complaint.status, input.toStatus);
  if (!rule) {
    throw new AppError(
      400,
      `Cannot transition complaint from ${complaint.status} to ${input.toStatus}.`
    );
  }

  const isAdmin = auth.role === UserRole.ADMIN;
  if (!isAdmin) {
    if (!rule.allowedRoles.includes(auth.role)) {
      throw new AppError(403, "Your role cannot perform this transition.");
    }
    if (rule.requiresSameHostelWarden && auth.hostelId !== complaint.hostelId.toString()) {
      throw new AppError(403, "You can only manage complaints for your own hostel.");
    }
    if (rule.requiresAssignedStaff && complaint.assignedStaffId?.toString() !== auth.sub) {
      throw new AppError(403, "Only the assigned staff member can perform this transition.");
    }
    if (rule.requiresOwnerStudent && complaint.studentId.toString() !== auth.sub) {
      throw new AppError(403, "Only the student who filed this complaint can perform this transition.");
    }
  }

  if (input.toStatus === ComplaintStatus.ASSIGNED) {
    const { assignedDepartmentId, assignedStaffId } = input;
    if (!assignedDepartmentId || !assignedStaffId) {
      throw new AppError(400, "assignedDepartmentId and assignedStaffId are required.");
    }

    const { department, staff } = await validateAssignmentTarget(assignedDepartmentId, assignedStaffId);

    complaint.assignedDepartmentId = department._id;
    complaint.assignedStaffId = staff._id;
    complaint.assignedAt = new Date();
  }

  const fromStatus = complaint.status;
  complaint.status = input.toStatus;

  const now = new Date();
  if (input.toStatus === ComplaintStatus.ACKNOWLEDGED) complaint.acknowledgedAt = now;
  if (input.toStatus === ComplaintStatus.RESOLVED) complaint.resolvedAt = now;
  if (input.toStatus === ComplaintStatus.CLOSED) complaint.closedAt = now;

  await complaint.save();

  await ComplaintStatusHistory.create({
    complaintId: complaint._id,
    fromStatus,
    toStatus: input.toStatus,
    actorId: auth.sub,
    actorRole: auth.role,
    note: input.note,
  });

  switch (input.toStatus) {
    case ComplaintStatus.ACKNOWLEDGED:
      await notifyComplaintAcknowledged(complaint);
      break;
    case ComplaintStatus.ASSIGNED:
      await notifyComplaintAssigned(complaint);
      break;
    case ComplaintStatus.IN_PROGRESS:
    case ComplaintStatus.RESOLVED:
      await notifyComplaintStatusChanged(complaint, fromStatus);
      break;
    case ComplaintStatus.REOPENED:
      await notifyComplaintReopened(complaint);
      break;
    case ComplaintStatus.CLOSED:
      break;
  }

  return complaint;
}

export async function rateComplaint(
  auth: AccessTokenPayload,
  complaintId: string,
  rating: number
): Promise<ComplaintDocument> {
  const complaint = await getComplaintById(auth, complaintId);

  if (auth.role !== UserRole.ADMIN && complaint.studentId.toString() !== auth.sub) {
    throw new AppError(403, "Only the student who filed this complaint can rate it.");
  }
  if (![ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED].includes(complaint.status)) {
    throw new AppError(400, "You can only rate a complaint after it has been resolved.");
  }

  complaint.rating = rating;
  await complaint.save();
  return complaint;
}

const REASSIGNABLE_STATUSES: ComplaintStatus[] = [
  ComplaintStatus.ASSIGNED,
  ComplaintStatus.IN_PROGRESS,
  ComplaintStatus.REOPENED,
];

/**
 * Route middleware already restricts this to WARDEN/ADMIN. If the complaint is
 * still ACKNOWLEDGED, this performs the initial ACKNOWLEDGED->ASSIGNED transition
 * (reusing the state machine). If it's already assigned/in progress/reopened,
 * this reassigns department/staff without changing status.
 */
export async function assignComplaint(
  auth: AccessTokenPayload,
  complaintId: string,
  input: AssignComplaintInput
): Promise<ComplaintDocument> {
  const complaint = await getComplaintById(auth, complaintId);

  if (complaint.status === ComplaintStatus.ACKNOWLEDGED) {
    return transitionComplaintStatus(auth, complaintId, {
      toStatus: ComplaintStatus.ASSIGNED,
      assignedDepartmentId: input.departmentId,
      assignedStaffId: input.staffId,
      note: input.note,
    });
  }

  if (!REASSIGNABLE_STATUSES.includes(complaint.status)) {
    throw new AppError(
      400,
      `Complaints in ${complaint.status} status cannot be assigned. Acknowledge the complaint first.`
    );
  }

  if (auth.role !== UserRole.ADMIN && auth.hostelId !== complaint.hostelId.toString()) {
    throw new AppError(403, "You can only manage complaints for your own hostel.");
  }

  const { department, staff } = await validateAssignmentTarget(input.departmentId, input.staffId);
  const previousStaffId = complaint.assignedStaffId?.toString() ?? null;

  complaint.assignedDepartmentId = department._id;
  complaint.assignedStaffId = staff._id;
  complaint.assignedAt = new Date();
  await complaint.save();

  await ComplaintStatusHistory.create({
    complaintId: complaint._id,
    fromStatus: complaint.status,
    toStatus: complaint.status,
    actorId: auth.sub,
    actorRole: auth.role,
    note: input.note ?? `Reassigned from staff ${previousStaffId ?? "unassigned"} to ${staff._id.toString()}.`,
  });

  await notifyComplaintReassigned(complaint, previousStaffId);

  return complaint;
}

/**
 * Route middleware restricts this to WARDEN/ADMIN. Unlike the automatic
 * escalation sweep (which gates on elapsed time past deadline), a manual
 * escalation just moves to the next configured level immediately.
 */
export async function escalateComplaintManually(
  auth: AccessTokenPayload,
  complaintId: string,
  input: EscalateComplaintInput
): Promise<ComplaintDocument> {
  const complaint = await getComplaintById(auth, complaintId);

  if (complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.CLOSED) {
    throw new AppError(400, "Cannot escalate a resolved or closed complaint.");
  }
  if (auth.role !== UserRole.ADMIN && auth.hostelId !== complaint.hostelId.toString()) {
    throw new AppError(403, "You can only manage complaints for your own hostel.");
  }

  const nextLevel = await resolveNextEscalationLevel(
    complaint.category,
    complaint.priority,
    complaint.escalationLevel
  );
  if (!nextLevel) {
    throw new AppError(400, "No further escalation level is configured for this complaint.");
  }

  await applyEscalation(
    complaint,
    nextLevel,
    auth.sub,
    auth.role,
    input.note ?? `Manually escalated to level ${nextLevel.level} (target: ${nextLevel.targetRole}) by ${auth.role}.`
  );

  return complaint;
}
