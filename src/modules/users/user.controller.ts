import { Request, Response } from "express";
import { createUserByAdmin } from "./user.service";

export async function createUserHandler(req: Request, res: Response): Promise<void> {
  const user = await createUserByAdmin(req.body);
  res.status(201).json({ user });
}
