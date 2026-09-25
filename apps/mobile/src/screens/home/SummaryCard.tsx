import { StyleSheet, Text, View } from "react-native";
import { colors, radius, space, tabular, type } from "../../theme";
import { formatTaka } from "../../format";
import { CategoryDonut, type DonutSegment } from "./CategoryDonut";

export interface CategorySlice extends DonutSegment {
  name: string;
  total: number;
}

/**
 * Summary card (signature): a sunken #FAFAFA card holding the donut on the
 * left and a legend on the right — 9px color dots, category names, and
 * right-aligned tabular amounts — separated by a 20px gap.
 */
export function SummaryCard({
  slices,
  reduceMotion,
}: {
  slices: CategorySlice[];
  reduceMotion: boolean;
}) {
  return (
    <View style={styles.card}>
      <CategoryDonut segments={slices} reduceMotion={reduceMotion} />
      <View style={styles.legend}>
        {slices.map((s) => (
          <View key={s.name} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.name} numberOfLines={1}>
              {s.name}
            </Text>
            <Text style={styles.amount}>{formatTaka(s.total)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inset,
    marginTop: 22,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.padCard,
  },
  legend: { flex: 1, gap: 9 },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 3 },
  name: { fontFamily: type.body.fontFamily, fontSize: 12.5, color: colors.ink },
  amount: {
    ...tabular,
    marginLeft: "auto",
    fontFamily: type.body.fontFamily,
    fontSize: 12.5,
    color: colors.ink,
  },
});
