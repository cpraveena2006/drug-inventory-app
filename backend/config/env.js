import { z } from "zod";

const environmentSchema = z.object({
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z.string().min(24, "JWT_SECRET must contain at least 24 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export function validateEnvironment(environment = process.env) {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid environment configuration: ${errors}`);
  }
  return result.data;
}
