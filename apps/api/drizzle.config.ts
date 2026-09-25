import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../../packages/shared/src/drizzle.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
