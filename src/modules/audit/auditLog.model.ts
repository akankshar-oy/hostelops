import { HydratedDocument, Schema, Types, model } from "mongoose";

export interface IAuditLog {
  actorId?: Types.ObjectId | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  timestamp: Date;
}

export type AuditLogDocument = HydratedDocument<IAuditLog>;

const auditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: "User" },
  actorRole: { type: String },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  previousState: { type: Schema.Types.Mixed, default: null },
  newState: { type: Schema.Types.Mixed, default: null },
  metadata: { type: Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: Date.now },
});

auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ actorId: 1, timestamp: -1 });

function forbidMutation(): never {
  throw new Error("AuditLog is insert-only; updates and deletes are not permitted.");
}

auditLogSchema.pre("updateOne", { document: false, query: true }, forbidMutation);
auditLogSchema.pre("updateMany", forbidMutation);
auditLogSchema.pre("findOneAndUpdate", forbidMutation);
auditLogSchema.pre("findOneAndReplace", forbidMutation);
auditLogSchema.pre("deleteOne", { document: false, query: true }, forbidMutation);
auditLogSchema.pre("deleteMany", forbidMutation);
auditLogSchema.pre("findOneAndDelete", forbidMutation);

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
