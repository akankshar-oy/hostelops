import { FilterQuery } from "mongoose";
import { Complaint, ComplaintDocument, IComplaint } from "./complaint.model";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export const complaintRepository = {
  create(data: Partial<IComplaint>): Promise<ComplaintDocument> {
    return Complaint.create(data);
  },

  findById(id: string): Promise<ComplaintDocument | null> {
    return Complaint.findById(id);
  },

  async findMany(
    filter: FilterQuery<IComplaint>,
    page: number,
    limit: number
  ): Promise<PaginatedResult<ComplaintDocument>> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Complaint.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },
};
