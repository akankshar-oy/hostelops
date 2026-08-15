import { HydratedDocument, Schema, Types, model } from "mongoose";

/**
 * Blocked ops: updateOne, updateMany, replaceOne, findOneAndUpdate, findOneAndReplace,
 * deleteOne, deleteMany, findOneAndDelete. findOneAndRemove is not included — it was
 * removed from Mongoose entirely as of this installed version (8.24.3), superseded by
 * findOneAndDelete, so there's nothing to block.
 *
 * Insert-only enforcement below covers Mongoose's API surface only. Two known gaps:
 * - Model.bulkWrite() bypasses Mongoose middleware entirely (driver-level batch op, no hooks fire).
 * - Raw db.collection('complaintstatushistories').updateOne(...) calls bypass Mongoose's API
 *   surface entirely — schema hooks only intercept calls made through Mongoose.
 * True tamper-proofing against these would require DB-level permissions (an insert-only DB role
 * for this collection), not just application-layer hooks — out of scope for v1, revisit before
 * this goes to real production use.
 */

export interface IComplaintStatusHistory {
  complaintId: Types.ObjectId;
  fromStatus: string;
  toStatus: string;
  actorId: Types.ObjectId;
  actorRole: string;
  note?: string;
  timestamp: Date;
}

export type ComplaintStatusHistoryDocument = HydratedDocument<IComplaintStatusHistory>;

const complaintStatusHistorySchema = new Schema<IComplaintStatusHistory>({
  complaintId: { type: Schema.Types.ObjectId, ref: "Complaint", required: true, index: true },
  fromStatus: { type: String, required: true },
  toStatus: { type: String, required: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  actorRole: { type: String, required: true },
  note: { type: String },
  timestamp: { type: Date, default: Date.now },
});

function forbidMutation(): never {
  throw new Error("ComplaintStatusHistory is insert-only; updates and deletes are not permitted.");
}

complaintStatusHistorySchema.pre("updateOne", { document: true, query: true }, forbidMutation);
complaintStatusHistorySchema.pre("updateMany", forbidMutation);
complaintStatusHistorySchema.pre("replaceOne", forbidMutation);
complaintStatusHistorySchema.pre("findOneAndUpdate", forbidMutation);
complaintStatusHistorySchema.pre("findOneAndReplace", forbidMutation);
complaintStatusHistorySchema.pre("deleteOne", { document: true, query: true }, forbidMutation);
complaintStatusHistorySchema.pre("deleteMany", forbidMutation);
complaintStatusHistorySchema.pre("findOneAndDelete", forbidMutation);

export const ComplaintStatusHistory = model<IComplaintStatusHistory>(
  "ComplaintStatusHistory",
  complaintStatusHistorySchema
);
