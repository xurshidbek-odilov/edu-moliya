import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/edutizim",
  jwtSecret: process.env.JWT_SECRET ?? "development-only-secret-change-me",
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "123456",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
};
