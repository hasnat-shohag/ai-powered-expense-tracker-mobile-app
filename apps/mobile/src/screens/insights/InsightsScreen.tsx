import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect } from "react-native-svg";
import type { ExpenseSummaryResponse } from "@expense/shared";
import {
  currentMonthKey,
  previousMonth,
  summarize,
  type SummaryRange,
} from "../../db";
import { colors, pairFor, radius, space, tabular, type } from "../../theme";
import { formatTaka } from "../../format";
import { TopBar } from "../../ui/controls";
import { CategoryChips } from "../home/CategoryChips";
import { SummaryCard, type CategorySlice } from "../home/SummaryCard";

const RANGES = ["This month", "Last month", "All time"] as const;
type RangeLabel = (typeof RANGES)[number];

function rangeFor(label: RangeLabel): SummaryRange {
  if (label === "This month") return { kind: "month", month: currentMonthKey() };
  if (label === "Last month")
    return { kind: "month", month: previousMonth(currentMonthKey()) };
  return { kind: "all" };
}

/**
 * Insights: spend analytics for a chosen range — grand total, a category donut
 * + legend (reusing the Home SummaryCard), a daily-trend bar strip, and a
 * payment-method breakdown. Reads local SQLite via `summarize` (offline-first).
 */
export function InsightsScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState<RangeLabel>("This month");
  const [data, setData] = useState<ExpenseSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await summarize(rangeFor(label));
    setData(d);
    setLoading(false);
  }, [label]);

  useEffect(() => {
    void load();
  }, [load]);

  const slices: CategorySlice[] =
    data && data.total > 0
      ? data.byCategory.map((b) => ({
          name: b.key,
          total: b.total,
          color: pairFor(b.key).ink,
          pct: (b.total / data.total) * 100,
        }))
      : [];

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar title="Insights" onBack={onClose} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <CategoryChips
          chips={[...RANGES]}
          selected={label}
          onSelect={(c) => setLabel(c as RangeLabel)}
          reduceMotion={false}
        />

        {loading || !data ? (
          <ActivityIndicator color={colors.muted} style={styles.center} />
        ) : data.count === 0 ? (
          <Text style={styles.empty}>No spending in this range.</Text>
        ) : (
          <>
            <View style={styles.totalBlock}>
              <Text style={styles.total}>{formatTaka(data.total)}</Text>
              <Text style={styles.count}>
                {data.count} {data.count === 1 ? "expense" : "expenses"}
              </Text>
            </View>

            {slices.length > 0 && (
              <SummaryCard slices={slices} reduceMotion={false} />
            )}

            {data.daily.length > 1 && <DailyBars daily={data.daily} />}

            <Text style={styles.section}>By payment method</Text>
            <View style={styles.card}>
              {data.byPaymentMethod.map((b, i) => (
                <View key={b.key} style={[styles.pmRow, i > 0 && styles.divided]}>
                  <Text style={styles.pmLabel} numberOfLines={1}>
                    {b.key}
                  </Text>
                  <Text style={styles.pmValue}>{formatTaka(b.total)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
// MARKER_APPEND

/** A compact daily-spend bar strip, scaled to the busiest day in the range. */
function DailyBars({ daily }: { daily: ExpenseSummaryResponse["daily"] }) {
  const max = Math.max(...daily.map((d) => d.total), 1);
  const H = 64;
  const GAP = 3;
  const width = 100; // viewBox units; bars scale to fill
  const barW = Math.max((width - GAP * (daily.length - 1)) / daily.length, 0.5);

  return (
    <View style={styles.barsWrap}>
      <Text style={styles.section}>Daily trend</Text>
      <Svg width="100%" height={H} viewBox={`0 0 ${width} ${H}`} preserveAspectRatio="none">
        {daily.map((d, i) => {
          const h = Math.max((d.total / max) * (H - 2), d.total > 0 ? 2 : 0);
          return (
            <Rect
              key={d.day}
              x={i * (barW + GAP)}
              y={H - h}
              width={barW}
              height={h}
              rx={0.6}
              fill={colors.actionBlue}
            />
          );
        })}
      </Svg>
      <View style={styles.barsAxis}>
        <Text style={styles.axisText}>{daily[0]?.day.slice(5)}</Text>
        <Text style={styles.axisText}>{daily[daily.length - 1]?.day.slice(5)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  wrap: { paddingHorizontal: space.inset, paddingTop: space.gap },
  center: { marginTop: 40 },
  empty: {
    fontFamily: type.caption.fontFamily,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 40,
  },
  totalBlock: { marginTop: space.section, gap: 4 },
  total: { ...type.display, color: colors.ink },
  count: { fontFamily: type.caption.fontFamily, fontSize: 12, color: colors.muted },
  barsWrap: { marginTop: space.section },
  barsAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  axisText: { fontFamily: type.caption.fontFamily, fontSize: 11, color: colors.muted },
  section: { ...type.label, color: colors.muted, marginTop: space.section, marginBottom: 2 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: "hidden",
    marginTop: 8,
  },
  pmRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  divided: { borderTopWidth: 1, borderTopColor: colors.line },
  pmLabel: { fontFamily: type.body.fontFamily, fontSize: 14, color: colors.ink, flex: 1 },
  pmValue: {
    ...tabular,
    fontFamily: type.body.fontFamily,
    fontSize: 14,
    color: colors.ink,
  },
});
