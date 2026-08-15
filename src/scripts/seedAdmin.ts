import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { User, UserRole } from "../modules/users/user.model";

const SALT_ROUNDS = 12;

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "System Admin";

  if (!email || !password) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before running this script.");
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin account already exists for ${email}; nothing to do.`);
  } else {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await User.create({ name, email, passwordHash, role: UserRole.ADMIN });
    console.log(`Created admin account for ${email}.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Failed to seed admin account:", err);
  process.exit(1);
});
