import cookieParser from "cookie-parser";
import express from "express";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import complaintRoutes from "./modules/complaints/complaint.routes";
import departmentRoutes from "./modules/departments/department.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import userRoutes from "./modules/users/user.routes";

async function main(): Promise<void> {
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/complaints", complaintRoutes);
  app.use("/api/departments", departmentRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/users", userRoutes);

  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
