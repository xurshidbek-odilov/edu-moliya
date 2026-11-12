import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { ensureAdmin } from "../services/admin.js";

try {
  await connectDatabase();
  await ensureAdmin();
  console.log("Admin tayyor.");
} finally {
  await disconnectDatabase();
}
