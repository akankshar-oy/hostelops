import { HydratedDocument, Schema, Types, model } from "mongoose";

export interface IHostel {
  name: string;
  wardenId?: Types.ObjectId;
  address: string;
}

export type HostelDocument = HydratedDocument<IHostel>;

const hostelSchema = new Schema<IHostel>({
  name: { type: String, required: true },
  wardenId: { type: Schema.Types.ObjectId, ref: "User" },
  address: { type: String, required: true },
});

export const Hostel = model<IHostel>("Hostel", hostelSchema);
