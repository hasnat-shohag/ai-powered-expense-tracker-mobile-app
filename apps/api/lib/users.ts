import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import {
  type UserProfile,
  type Subscription,
  entitlementsFor,
  type Entitlements,
} from "@expense/shared";
import { db as dbSchema } from "@expense/shared";
import type { UserRow, SubscriptionRow } from "@expense/shared";
import { env } from "./env.js";
import { getDb } from "./db.js";
import type { SessionClaims } from "./clerk.js";

const { users, subscriptions } = dbSchema;

let clerk: ReturnType<typeof createClerkClient> | null = null;
function clerkClient() {
  if (!clerk) clerk = createClerkClient({ secretKey: env().CLERK_SECRET_KEY });
  return clerk;
}

export interface UserBundle {
  user: UserRow;
  subscription: SubscriptionRow;
}

/**
 * Lazy per-user provisioning (no Clerk webhook). On the first authenticated
 * request we insert the `users` row — seeding email/name/image from the token
 * claims, falling back to the Clerk Backend API — and guarantee a default
 * `free` subscription. On every later request we just bump `last_seen_at`.
 * Returns the user + subscription so callers (GET /me) need no extra query.
 */
export async function ensureUser(
  ownerId: string,
  claims: SessionClaims,
): Promise<UserBundle> {
  const db = getDb();
  const now = new Date();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);

  let user: UserRow;
  if (existing[0]) {
    const updated = await db
      .update(users)
      .set({ lastSeenAt: now })
      .where(eq(users.id, ownerId))
      .returning();
    user = updated[0] ?? existing[0];
  } else {
    const profile = await resolveProfile(ownerId, claims);
    const inserted = await db
      .insert(users)
      .values({
        id: ownerId,
        email: profile.email,
        displayName: profile.displayName,
        imageUrl: profile.imageUrl,
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
      })
      // Concurrent first requests can race; the loser just refreshes lastSeen.
      .onConflictDoUpdate({ target: users.id, set: { lastSeenAt: now } })
      .returning();
    user = inserted[0]!;
  }

  const subscription = await ensureSubscription(ownerId, now);
  return { user, subscription };
}

/** Guarantee exactly one subscription row for the user (default free/active). */
async function ensureSubscription(
  userId: string,
  now: Date,
): Promise<SubscriptionRow> {
  const db = getDb();
  const found = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (found[0]) return found[0];

  const inserted = await db
    .insert(subscriptions)
    .values({
      id: uuidv7(),
      userId,
      plan: "free",
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    // If a racing request created it first, do nothing and re-read below.
    .onConflictDoNothing({ target: subscriptions.userId })
    .returning();
  if (inserted[0]) return inserted[0];

  const reread = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return reread[0]!;
}

/** Load the user + subscription for an already-provisioned caller. */
export async function getUserBundle(ownerId: string): Promise<UserBundle | null> {
  const db = getDb();
  const u = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
  if (!u[0]) return null;
  const s = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, ownerId))
    .limit(1);
  if (!s[0]) return null;
  return { user: u[0], subscription: s[0] };
}

/** Resolve display fields from claims, then the Clerk Backend API as fallback. */
async function resolveProfile(
  ownerId: string,
  claims: SessionClaims,
): Promise<{ email: string; displayName: string; imageUrl: string | null }> {
  let email = claims.email;
  let displayName = claims.name ?? "";
  let imageUrl = claims.image ?? null;

  if (!email || !displayName || !imageUrl) {
    try {
      const u = await clerkClient().users.getUser(ownerId);
      email =
        email ??
        u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
          ?.emailAddress ??
        u.emailAddresses[0]?.emailAddress;
      displayName =
        displayName ||
        [u.firstName, u.lastName].filter(Boolean).join(" ") ||
        u.username ||
        "";
      imageUrl = imageUrl ?? u.imageUrl ?? null;
    } catch (e) {
      console.error("[users] Clerk getUser failed:", (e as Error)?.message);
    }
  }

  // email is NOT NULL; last-resort placeholder keeps provisioning from failing.
  return { email: email ?? `${ownerId}@unknown.local`, displayName, imageUrl };
}

// ---- Wire mappers (DB row → shared schema shape) ------------------------

export function toUserProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    imageUrl: row.imageUrl,
    timezone: row.timezone,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toSubscription(row: SubscriptionRow): Subscription {
  return {
    plan: row.plan,
    status: row.status,
    currentPeriodStart: row.currentPeriodStart
      ? row.currentPeriodStart.toISOString()
      : null,
    currentPeriodEnd: row.currentPeriodEnd
      ? row.currentPeriodEnd.toISOString()
      : null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  };
}

export function entitlementsForRow(row: SubscriptionRow): Entitlements {
  return entitlementsFor(row.plan);
}
