import { StyleSheet, Text, View } from "react-native";
import type { Expense } from "@expense/shared";
import { colors, space, type } from "../../theme";
import { formatDay } from "../../format";
import { parseAmount } from "../../lib/amount";
import { TextField } from "../../ui/controls";

/** The editable fields of an expense (spentAt is shown read-only for now). */
export type ExpenseEdits = Pick<
  Expense,
  "amount" | "category" | "merchant" | "description" | "paymentMethod"
>;

/**
 * Controlled editor for one expense — the shared body of both the draft-review
 * row editor and the edit-existing-row screen. The parent owns the working
 * value; the form emits field patches. Amount is parsed leniently so a
 * half-typed number never crashes the field.
 */
export function ExpenseForm({
  value,
  onChange,
}: {
  value: Expense;
  onChange: (patch: Partial<ExpenseEdits>) => void;
}) {
  return (
    <View style={styles.form}>
      <TextField
        label="Amount (৳)"
        value={value.amount ? String(value.amount) : ""}
        onChangeText={(t) => onChange({ amount: parseAmount(t) })}
        keyboardType="numeric"
        placeholder="0"
      />
      <TextField
        label="Category"
        value={value.category}
        onChangeText={(t) => onChange({ category: t })}
        placeholder="e.g. Food"
      />
      <TextField
        label="Merchant"
        value={value.merchant}
        onChangeText={(t) => onChange({ merchant: t })}
        placeholder="Where it was spent"
      />
      <TextField
        label="Description"
        value={value.description}
        onChangeText={(t) => onChange({ description: t })}
        placeholder="Optional note"
        multiline
      />
      <TextField
        label="Payment method"
        value={value.paymentMethod ?? ""}
        onChangeText={(t) => onChange({ paymentMethod: t.trim() ? t : null })}
        placeholder="cash · bKash · card"
      />
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>Spent</Text>
        <Text style={styles.dateValue}>{formatDay(value.spentAt)}</Text>
      </View>
    </View>
  );
}

/** Parse a partially-typed amount to a non-negative number (0 on garbage). */
export { parseAmount } from "../../lib/amount";

const styles = StyleSheet.create({
  form: { gap: space.gap },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  dateLabel: { ...type.label, color: colors.muted },
  dateValue: { fontFamily: type.body.fontFamily, fontSize: 14, color: colors.ink },
});
