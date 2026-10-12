/**
 * Ordered, forward-only schema migrations for the local SQLite mirror.
 *
 * Each entry's index + 1 is its schema version; the runner applies every
 * migration whose version is greater than the database's current
 * `user_version`, inside a transaction, then bumps `user_version`. Migrations
 * are append-only: never edit or reorder a shipped entry, only add new ones.
 */
export const migrations: string[] = [
  // v1 — local core: expenses mirror + the two local-only queues + kv meta.
  `
  CREATE TABLE IF NOT EXISTS expenses (
    id             TEXT PRIMARY KEY NOT NULL,
    group_id       TEXT NOT NULL,
    amount         REAL NOT NULL,
    currency       TEXT NOT NULL DEFAULT 'BDT',
    category       TEXT NOT NULL,
    merchant       TEXT NOT NULL DEFAULT '',
    description    TEXT NOT NULL DEFAULT '',
    payment_method TEXT,
    source         TEXT NOT NULL,
    raw_input      TEXT NOT NULL DEFAULT '',
    receipt_key    TEXT,
    spent_at       TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    deleted_at     TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_expenses_spent_at ON expenses (spent_at);
  CREATE INDEX IF NOT EXISTS idx_expenses_updated_at ON expenses (updated_at);
  CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses (group_id);

  CREATE TABLE IF NOT EXISTS pending_captures (
    id         TEXT PRIMARY KEY NOT NULL,
    source     TEXT NOT NULL,
    raw_text   TEXT NOT NULL DEFAULT '',
    image_path TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS outbox (
    id         TEXT PRIMARY KEY NOT NULL,
    op         TEXT NOT NULL,
    expense_id TEXT NOT NULL,
    payload    TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON outbox (created_at);

  CREATE TABLE IF NOT EXISTS app_meta (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

/** The schema version this build expects — the count of migrations. */
export const TARGET_VERSION = migrations.length;
