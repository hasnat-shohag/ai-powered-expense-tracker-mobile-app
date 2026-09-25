import { StyleSheet, View } from "react-native";
import type { Expense } from "@expense/shared";
import { colors, radius, shadow } from "../../theme";
import { ExpenseRow } from "./ExpenseRow";

/**
 * List card: a single white card with a hairline border and the card lift,
 * holding the recent expense rows. Rows are divided by a 1px hairline (a top
 * border on every row but the first) rather than each having its own box.
 */
export function RecentCard({
  expenses,
  onPressRow,
}: {
  expenses: Expense[];
  onPressRow?: (e: Expense) => void;
}) {
  return (
    <View style={styles.card}>
      {expenses.map((e, i) => (
        <View key={e.id} style={i > 0 ? styles.divided : undefined}>
          <ExpenseRow expense={e} onPress={onPressRow} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ground,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    marginTop: 10,
    overflow: "hidden",
    ...shadow.card,
  },
  divided: { borderTopWidth: 1, borderTopColor: colors.line },
});
