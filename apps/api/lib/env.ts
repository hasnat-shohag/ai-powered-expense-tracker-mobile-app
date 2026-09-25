import { z } from "zod";

/**
 * Backend environment contract. Every third-party secret lives here and nowhere
 * near the mobile app. Validated once at module load so a missing var fails
 * loudly instead of at the first request.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_BASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1),
  API_BEARER_TOKEN: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Lazily validate + cache env. Throws with the list of missing/invalid vars. */
export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid backend environment — ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
