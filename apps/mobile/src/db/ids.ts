import { v7 as uuidv7 } from "uuid";

/**
 * Client-generated primary key. uuidv7 is time-ordered, so offline-created
 * rows sort by creation time and get a stable id the backend accepts as-is.
 */
export function newId(): string {
  return uuidv7();
}

/** Current instant as an ISO-8601 UTC string — the wire + storage format. */
export function nowIso(): string {
  return new Date().toISOString();
}
