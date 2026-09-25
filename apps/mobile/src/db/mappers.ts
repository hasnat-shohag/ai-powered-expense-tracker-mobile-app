import type { Expense } from "@expense/shared";

/** Shape of an `expenses` row as SQLite returns it (snake_case columns). */
export interface ExpenseRow {
  id: string;
  group_id: string;
  amount: number;
  currency: string;
  category: string;
  merchant: string;
  description: string;
  payment_method: string | null;
  source: string;
  raw_input: string;
  receipt_key: string | null;
  spent_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Map a raw SQLite row to the shared camelCase Expense. */
export function rowToExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    groupId: r.group_id,
    amount: r.amount,
    currency: r.currency,
    category: r.category,
    merchant: r.merchant,
    description: r.description,
    paymentMethod: r.payment_method,
    source: r.source as Expense["source"],
    rawInput: r.raw_input,
    receiptKey: r.receipt_key,
    spentAt: r.spent_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

/** Positional bind values for an INSERT/REPLACE of one expense (column order). */
export function expenseToBindings(e: Expense): (string | number | null)[] {
  return [
    e.id,
    e.groupId,
    e.amount,
    e.currency,
    e.category,
    e.merchant,
    e.description,
    e.paymentMethod,
    e.source,
    e.rawInput,
    e.receiptKey,
    e.spentAt,
    e.createdAt,
    e.updatedAt,
    e.deletedAt,
  ];
}

export const EXPENSE_COLUMNS =
  "id, group_id, amount, currency, category, merchant, description, " +
  "payment_method, source, raw_input, receipt_key, spent_at, created_at, " +
  "updated_at, deleted_at";

export const EXPENSE_PLACEHOLDERS = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
