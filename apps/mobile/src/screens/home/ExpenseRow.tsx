import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Expense } from "@expense/shared";
import { colors, radius, tabular, type } from "../../theme";
import { pairFor } from "../../theme";
import { formatDay, formatTaka } from "../../format";
import { CategoryIcon } from "../../ui/icons";

/**
 * Expense Row (signature): a circular category tile (38px, tint fill, category-
 * ink stroke icon) · a middle block (merchant name + date·category sub-line) ·
 * a right-aligned tabular amount. Rows share one card and divide by hairline —
 * the divider is applied by the parent, not here.
 */
export function ExpenseRow({
  expense,
  onPress,
}: {
  expense: Expense;
  onPress?: (e: Expense) => void;
}) {
  const pair = pairFor(expense.category);
  const title = expense.merchant || expense.description || expense.category;

  return (
    <Pressable
      style={styles.row}
      onPress={onPress ? () => onPress(expense) : undefined}
      android_ripple={{ color: colors.line }}
    >
      <View style={[styles.tile, { backgroundColor: pair.tint }]}>
        <CategoryIcon category={expense.category} color={pair.ink} />
      </View>
      <View style={styles.mid}>
        <Text style={styles.merchant} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {formatDay(expense.spentAt)} · {expense.category}
        </Text>
      </View>
      <Text style={styles.amount}>{formatTaka(expense.amount)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  tile: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  mid: { flex: 1, minWidth: 0 },
  merchant: { fontFamily: type.body.fontFamily, fontSize: 14, color: colors.ink },
  sub: {
    fontFamily: type.caption.fontFamily,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  amount: {
    ...tabular,
    fontFamily: type.body.fontFamily,
    fontSize: 14,
    color: colors.ink,
  },
});
