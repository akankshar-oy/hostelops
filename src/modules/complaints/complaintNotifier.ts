import { Department } from "../departments/department.model";
import { EscalationTarget } from "../escalation/escalationRule.model";
import { User, UserRole } from "../users/user.model";
import { NotificationType } from "../notifications/notification.model";
import { enqueueNotification } from "../../queues/notification.queue";
import { ComplaintDocument, ComplaintStatus } from "./complaint.model";

async function notifyOne(
  userId: string,
  complaint: ComplaintDocument,
  type: NotificationType,
  message: string
): Promise<void> {
  await enqueueNotification({
    userId,
    complaintId: complaint._id.toString(),
    type,
    message,
  });
}

export async function notifyComplaintSubmitted(complaint: ComplaintDocument): Promise<void> {
  const wardens = await User.find({ role: UserRole.WARDEN, hostelId: complaint.hostelId });
  await Promise.all(
    wardens.map((warden) =>
      notifyOne(
        warden._id.toString(),
        complaint,
        NotificationType.COMPLAINT_SUBMITTED,
        `New complaint submitted: "${complaint.title}".`
      )
    )
  );
}

export async function notifyComplaintAcknowledged(complaint: ComplaintDocument): Promise<void> {
  await notifyOne(
    complaint.studentId.toString(),
    complaint,
    NotificationType.COMPLAINT_ACKNOWLEDGED,
    `Your complaint "${complaint.title}" has been acknowledged.`
  );
}

export async function notifyComplaintAssigned(complaint: ComplaintDocument): Promise<void> {
  const notifications: Promise<void>[] = [
    notifyOne(
      complaint.studentId.toString(),
      complaint,
      NotificationType.COMPLAINT_ASSIGNED,
      `Your complaint "${complaint.title}" has been assigned to a department.`
    ),
  ];

  if (complaint.assignedStaffId) {
    notifications.push(
      notifyOne(
        complaint.assignedStaffId.toString(),
        complaint,
        NotificationType.COMPLAINT_ASSIGNED,
        `You have been assigned a new complaint: "${complaint.title}".`
      )
    );
  }

  await Promise.all(notifications);
}

export async function notifyComplaintReassigned(
  complaint: ComplaintDocument,
  previousStaffId: string | null
): Promise<void> {
  const notifications: Promise<void>[] = [];

  if (complaint.assignedStaffId) {
    notifications.push(
      notifyOne(
        complaint.assignedStaffId.toString(),
        complaint,
        NotificationType.COMPLAINT_ASSIGNED,
        `You have been assigned a complaint: "${complaint.title}".`
      )
    );
  }

  if (previousStaffId && previousStaffId !== complaint.assignedStaffId?.toString()) {
    notifications.push(
      notifyOne(
        previousStaffId,
        complaint,
        NotificationType.COMPLAINT_ASSIGNED,
        `Complaint "${complaint.title}" has been reassigned to another staff member.`
      )
    );
  }

  await Promise.all(notifications);
}

export async function notifyComplaintStatusChanged(
  complaint: ComplaintDocument,
  fromStatus: string
): Promise<void> {
  const type =
    complaint.status === ComplaintStatus.RESOLVED
      ? NotificationType.COMPLAINT_RESOLVED
      : NotificationType.COMPLAINT_STATUS_CHANGED;

  await notifyOne(
    complaint.studentId.toString(),
    complaint,
    type,
    `Your complaint "${complaint.title}" status changed from ${fromStatus} to ${complaint.status}.`
  );
}

export async function notifyComplaintReopened(complaint: ComplaintDocument): Promise<void> {
  if (!complaint.assignedStaffId) {
    return;
  }
  await notifyOne(
    complaint.assignedStaffId.toString(),
    complaint,
    NotificationType.COMPLAINT_REOPENED,
    `Complaint "${complaint.title}" was reopened by the student.`
  );
}

export async function notifyComplaintEscalated(
  complaint: ComplaintDocument,
  targetRole: EscalationTarget
): Promise<void> {
  let recipientIds: string[] = [];

  if (targetRole === EscalationTarget.DEPARTMENT_SUPERVISOR && complaint.assignedDepartmentId) {
    const department = await Department.findById(complaint.assignedDepartmentId);
    if (department?.supervisorId) {
      recipientIds = [department.supervisorId.toString()];
    }
  } else if (targetRole === EscalationTarget.WARDEN) {
    const wardens = await User.find({ role: UserRole.WARDEN, hostelId: complaint.hostelId });
    recipientIds = wardens.map((warden) => warden._id.toString());
  } else if (targetRole === EscalationTarget.ADMIN) {
    const admins = await User.find({ role: UserRole.ADMIN });
    recipientIds = admins.map((admin) => admin._id.toString());
  }

  await Promise.all(
    recipientIds.map((userId) =>
      notifyOne(
        userId,
        complaint,
        NotificationType.COMPLAINT_ESCALATED,
        `Complaint "${complaint.title}" has been escalated to you.`
      )
    )
  );
}
