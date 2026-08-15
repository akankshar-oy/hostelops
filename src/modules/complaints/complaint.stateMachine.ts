import { UserRole } from "../users/user.model";
import { ComplaintStatus } from "./complaint.model";

export interface TransitionRule {
  allowedRoles: UserRole[];
  requiresAssignedStaff?: boolean;
  requiresOwnerStudent?: boolean;
  requiresSameHostelWarden?: boolean;
}

type TransitionTable = Partial<Record<ComplaintStatus, Partial<Record<ComplaintStatus, TransitionRule>>>>;

export const COMPLAINT_TRANSITIONS: TransitionTable = {
  [ComplaintStatus.OPEN]: {
    [ComplaintStatus.ACKNOWLEDGED]: {
      allowedRoles: [UserRole.WARDEN],
      requiresSameHostelWarden: true,
    },
  },
  [ComplaintStatus.ACKNOWLEDGED]: {
    [ComplaintStatus.ASSIGNED]: {
      allowedRoles: [UserRole.WARDEN],
      requiresSameHostelWarden: true,
    },
  },
  [ComplaintStatus.ASSIGNED]: {
    [ComplaintStatus.IN_PROGRESS]: {
      allowedRoles: [UserRole.STAFF],
      requiresAssignedStaff: true,
    },
  },
  [ComplaintStatus.IN_PROGRESS]: {
    [ComplaintStatus.RESOLVED]: {
      allowedRoles: [UserRole.STAFF],
      requiresAssignedStaff: true,
    },
  },
  [ComplaintStatus.RESOLVED]: {
    [ComplaintStatus.CLOSED]: {
      allowedRoles: [UserRole.STUDENT],
      requiresOwnerStudent: true,
    },
    [ComplaintStatus.REOPENED]: {
      allowedRoles: [UserRole.STUDENT],
      requiresOwnerStudent: true,
    },
  },
  [ComplaintStatus.REOPENED]: {
    [ComplaintStatus.IN_PROGRESS]: {
      allowedRoles: [UserRole.STAFF],
      requiresAssignedStaff: true,
    },
  },
  [ComplaintStatus.CLOSED]: {},
};

export function getTransitionRule(
  from: ComplaintStatus,
  to: ComplaintStatus
): TransitionRule | undefined {
  return COMPLAINT_TRANSITIONS[from]?.[to];
}
