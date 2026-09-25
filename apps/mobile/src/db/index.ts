export { getDb, resetDbHandle } from "./database";
export { newId, nowIso } from "./ids";
export { TARGET_VERSION } from "./migrations";
export type { ExpenseRow } from "./mappers";
export {
  createExpenses,
  getExpense,
  updateExpense,
  softDeleteExpense,
  listExpenses,
  monthTotal,
  categoryBreakdown,
  applyServerRows,
  currentMonthKey,
  previousMonth,
  type ExpensePatch,
  type MonthKey,
} from "./expenses";
export {
  addPendingCapture,
  listPendingCaptures,
  removePendingCaptures,
  pendingCount,
  type PendingCapture,
} from "./pending";
export {
  enqueueOp,
  listOutbox,
  removeOutbox,
  outboxCount,
  type OutboxEntry,
} from "./outbox";
export { getMeta, setMeta, SYNC_CURSOR_KEY } from "./meta";
