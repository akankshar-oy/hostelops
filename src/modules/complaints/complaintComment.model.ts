import { HydratedDocument, Schema, Types, model } from "mongoose";

export interface IComplaintComment {
  complaintId: Types.ObjectId;
  authorId: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ComplaintCommentDocument = HydratedDocument<IComplaintComment>;

const complaintCommentSchema = new Schema<IComplaintComment>(
  {
    complaintId: { type: Schema.Types.ObjectId, ref: "Complaint", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

export const ComplaintComment = model<IComplaintComment>("ComplaintComment", complaintCommentSchema);
