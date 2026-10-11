import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, space, tabular, type } from "../../theme";
import { formatTaka } from "../../format";
import { CategoryDonut } from "./CategoryDonut";
import type { CategorySlice } from "./slices";

export type { CategorySlice };

/**
 * The legend row rhythm. The card's height is set by this, so the values are
 * named and the row line-box is pinned to ROW_H — an implicit line height would
 * make `donutSize` a guess.
 */
const ROW_H = 17;
const ROW_GAP = 9;
/** The ring's floor: below this the arcs stop being readable as shares. */
const DONUT_MIN = 72;
/** The ring's ceiling, so a six-row card never outweighs the month total. */
const DONUT_MAX = 128;

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);

/**
 * Summary card (signature): a sunken #FAFAFA card holding the donut on the
 * left and a legend on the right — 9px color dots, category names, and
 * right-aligned tabular amounts.
 *
 * The card is bounded by its legend (see `slices.ts`): at most six rows, so
 * a many-category month costs the same vertical space as a three-category one.
 * The ring is sized from the legend's height rather than fixed, so it fills the
 * card it lives in. Legend rows are the filter target — an arc is a ~6dp target
 * and cannot carry a touch affordance honestly.
 */
export function SummaryCard({
  slices,
  selected,
  onSelect,
  reduceMotion,
}: {
  slices: CategorySlice[];
  selected?: string;
  onSelect?: (category: string) => void;
  reduceMotion: boolean;
}) {
  const rows = slices.length;
  const legendHeight = rows * ROW_H + Math.max(rows - 1, 0) * ROW_GAP;
  const donutSize = clamp(legendHeight, DONUT_MIN, DONUT_MAX);

  return (
    <View style={styles.card}>
      <View style={styles.donut}>
        <CategoryDonut
          segments={slices}
          size={donutSize}
          reduceMotion={reduceMotion}
        />
      </View>
      <View style={styles.legend}>
        {slices.map((s) => (
          <LegendRow
            key={s.name}
            slice={s}
            on={selected === s.name}
            onSelect={onSelect}
          />
        ))}
      </View>
    </View>
  );
}

function LegendRow({
  slice,
  on,
  onSelect,
}: {
  slice: CategorySlice;
  on: boolean;
  onSelect?: (category: string) => void;
}) {
  const interactive = !slice.isOther && onSelect !== undefined;

  const body = (
    <>
      <View style={[styles.dot, { backgroundColor: slice.color }]} />
      <Text style={[styles.name, on && styles.nameOn]} numberOfLines={1}>
        {slice.name}
      </Text>
      <Text style={[styles.amount, on && styles.nameOn]}>
        {formatTaka(slice.total)}
      </Text>
    </>
  );

  if (!interactive) {
    // The aggregated tail: a bucket, not a category. Read-only on purpose.
    return <View style={[styles.row, slice.isOther && styles.rowOther]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={() => onSelect(slice.name)}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${slice.name}, ${formatTaka(slice.total)}`}
      accessibilityHint="Filters the ledger to this category"
      style={[styles.row, on && styles.rowOn]}
    >
      {body}
    </Pressable>
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
  donut: { justifyContent: "center" },
  legend: { flex: 1, gap: ROW_GAP },
  // Symmetric padding keeps the selected fill from shifting its own text.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: ROW_H,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: radius.md,
  },
  rowOther: { opacity: 0.75 },
  /** Selected state mirrors the chip language: a track fill, no layout shift. */
  rowOn: { backgroundColor: colors.fillTrack },
  dot: { width: 9, height: 9, borderRadius: 3 },
  name: {
    flexShrink: 1,
    fontFamily: type.body.fontFamily,
    fontSize: 12.5,
    lineHeight: ROW_H,
    color: colors.ink,
  },
  nameOn: { fontFamily: fonts.bold },
  amount: {
    ...tabular,
    marginLeft: "auto",
    fontFamily: type.body.fontFamily,
    fontSize: 12.5,
    lineHeight: ROW_H,
    color: colors.ink,
  },
});
