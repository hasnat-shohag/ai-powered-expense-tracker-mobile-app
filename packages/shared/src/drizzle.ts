import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";

/**
 * Canonical `expenses` table (Neon Postgres).
 *
 * The mobile app mirrors this table in local SQLite. All timestamps are stored
 * in UTC and rendered in device-local time only at display. `updated_at` drives
 * last-write-wins during sync; `deleted_at` is a soft-delete tombstone.
 *
 * `owner_id` is the tenant boundary: the verified Clerk user id (JWT `sub`),
 * stamped server-side on every write and filtered on every read. It never
 * crosses the wire — the mobile mirror has no owner column — so a client cannot
 * express or spoof ownership. Existing rows must be backfilled before this
 * column is enforced NOT NULL against a live database (see the deploy plan).
 */
export const expenses = pgTable(
  "expenses",
  {
    // Client-generated uuidv7 so offline rows have a stable id before they sync.
    id: uuid("id").primaryKey(),
    // Verified Clerk `sub` of the row's owner. Server-derived, never client-sent.
    ownerId: text("owner_id").notNull(),
    // Rows produced by a single parse/receipt share one group_id.
    groupId: uuid("group_id").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("BDT"),
    // LLM chooses the category freely; not constrained to an enum.
    category: text("category").notNull(),
    merchant: text("merchant").notNull().default(""),
    description: text("description").notNull().default(""),
    // cash | bKash | card | bank | ... — nullable, extracted when mentioned.
    paymentMethod: text("payment_method"),
    // How the expense was captured.
    source: text("source", { enum: ["text", "image", "voice"] }).notNull(),
    // Original input kept for later re-parse.
    rawInput: text("raw_input").notNull().default(""),
    // R2 object key for image-source rows only.
    receiptKey: text("receipt_key"),
    spentAt: timestamp("spent_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => ({
    // Owner-scoped read path: `where owner_id = ? and updated_at > ?`.
    ownerIdx: index("expenses_owner_idx").on(table.ownerId),
    ownerUpdatedIdx: index("expenses_owner_updated_idx").on(
      table.ownerId,
      table.updatedAt,
    ),
  }),
);

export type ExpenseRow = typeof expenses.$inferSelect;
export type NewExpenseRow = typeof expenses.$inferInsert;

/**
 * `users` — one row per authenticated Clerk user, provisioned lazily on the
 * first authenticated request (no Clerk webhook infra). The primary key IS the
 * Clerk `sub`, so it equals `expenses.owner_id` — a user and all their data
 * share one identifier. Profile fields are seeded from Clerk on insert and are
 * otherwise user-editable (display name, timezone).
 */
export const users = pgTable("users", {
  // Clerk user id (`sub`). Same value as expenses.owner_id.
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull().default(""),
  imageUrl: text("image_url"),
  // IANA tz for rendering/aggregation; app default is Asia/Dhaka.
  timezone: text("timezone").notNull().default("Asia/Dhaka"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  // Bumped on every authenticated request through ensureUser.
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

/**
 * `subscriptions` — current subscription state, 1:1 with a user (`user_id` is
 * unique). This pass models the data only: no payment provider, no history
 * table. Plan changes are admin-granted. `plan` drives entitlements (resolved
 * in code via PLAN_ENTITLEMENTS), `status` tracks lifecycle, and the period /
 * cancel fields are shaped for a future billing provider to populate.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id),
    plan: text("plan", { enum: ["free", "pro"] })
      .notNull()
      .default("free"),
    status: text("status", {
      enum: ["active", "trialing", "past_due", "canceled"],
    })
      .notNull()
      .default("active"),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
      mode: "date",
    }),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
      mode: "date",
    }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("subscriptions_user_idx").on(table.userId),
  }),
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type NewSubscriptionRow = typeof subscriptions.$inferInsert;
