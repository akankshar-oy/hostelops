import { ComplaintDocument } from "./complaint.model";
import { computeSlaSnapshot } from "./sla.service";

export function serializeComplaint(complaint: ComplaintDocument) {
  return {
    ...complaint.toObject(),
    sla: computeSlaSnapshot(complaint),
  };
}

export function serializeComplaints(complaints: ComplaintDocument[]) {
  return complaints.map(serializeComplaint);
}
