import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "./env.js";

/**
 * Cloudflare R2 is S3-compatible. Receipt images are proxied through the backend
 * (never uploaded with client-side keys) — one object per group_id.
 */
let cached: S3Client | null = null;

function client(): S3Client {
  if (cached) return cached;
  const e = env();
  cached = new S3Client({
    region: "auto",
    endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: e.R2_ACCESS_KEY_ID,
      secretAccessKey: e.R2_SECRET_ACCESS_KEY,
    },
  });
  return cached;
}

/** Upload a JPEG receipt and return its object key (`receipts/<groupId>.jpg`). */
export async function uploadReceipt(groupId: string, jpegBase64: string): Promise<string> {
  const key = `receipts/${groupId}.jpg`;
  const body = Buffer.from(jpegBase64, "base64");
  await client().send(
    new PutObjectCommand({
      Bucket: env().R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/jpeg",
    }),
  );
  return key;
}
