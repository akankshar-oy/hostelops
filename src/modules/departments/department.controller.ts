import { Request, Response } from "express";
import { requireParam } from "../../utils/requireParam";
import { createDepartment, listDepartments, listDepartmentStaff } from "./department.service";

export async function createDepartmentHandler(req: Request, res: Response): Promise<void> {
  const department = await createDepartment(req.body);
  res.status(201).json({ department });
}

export async function listDepartmentsHandler(_req: Request, res: Response): Promise<void> {
  const departments = await listDepartments();
  res.status(200).json({ departments });
}

export async function listDepartmentStaffHandler(req: Request, res: Response): Promise<void> {
  const staff = await listDepartmentStaff(requireParam(req.params.id, "id"));
  res.status(200).json({ staff });
}
