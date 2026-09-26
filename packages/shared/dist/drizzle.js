import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
/**
 * Canonical `expenses` table (Neon Postgres).
 *
 * The mobile app mirrors this table in local SQLite. All timestamps are stored
 * in UTC and rendered in device-local time only at display. `updated_at` drives
 * last-write-wins during sync; `deleted_at` is a soft-delete tombstone.
 */
export const expenses = pgTable("expenses", {
    // Client-generated uuidv7 so offline rows have a stable id before they sync.
    id: uuid("id").primaryKey(),
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
});
//# sourceMappingURL=drizzle.js.map