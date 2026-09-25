import { useCallback, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Expense } from "@expense/shared";
import {
  categoryBreakdown,
  currentMonthKey,
  listExpenses,
  monthTotal,
  previousMonth,
  type MonthKey,
} from "../../db";
import { requestSync, startNetworkSyncTrigger, syncNow } from "../../sync/engine";
import { colors, pairFor, space, type } from "../../theme";
import { formatMonthLabel } from "../../format";
import { MonthTotal } from "./MonthTotal";
import { SummaryCard, type CategorySlice } from "./SummaryCard";
import { CategoryChips } from "./CategoryChips";
import { RecentCard } from "./RecentCard";
import { Fab } from "./Fab";

const RECENT_LIMIT = 6;
const ALL = "All";

interface HomeData {
  total: number;
  prevTotal: number;
  slices: CategorySlice[];
  expenses: Expense[];
}

/** Build the donut/legend slices from a per-category breakdown. */
function toSlices(
  breakdown: { category: string; total: number }[],
  total: number,
): CategorySlice[] {
  if (total <= 0) return [];
  return breakdown.map((b) => ({
    name: b.category,
    total: b.total,
    color: pairFor(b.category).ink,
    pct: (b.total / total) * 100,
  }));
}

// PLACEHOLDER_APPEND

/**
 * The Home screen ("The Calm Ledger"): the month total leads, a donut + legend
 * explain its shape, category chips filter the ledger, and a single blue FAB
 * captures the next expense. Reads straight from local SQLite (offline-first)
 * and triggers a background sync on mount, on network regain, and on
 * pull-to-refresh.
 */
export function HomeScreen({
  onAddExpense,
  onEditExpense,
  reloadToken = 0,
}: {
  onAddExpense: () => void;
  onEditExpense?: (e: Expense) => void;
  reloadToken?: number;
}) {
  const insets = useSafeAreaInsets();
  const month: MonthKey = currentMonthKey();
  const prev = previousMonth(month);

  const [data, setData] = useState<HomeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(ALL);
  const [reduceMotion, setReduceMotion] = useState(false);

  const load = useCallback(async () => {
    const [total, prevTotal, breakdown, expenses] = await Promise.all([
      monthTotal(month),
      monthTotal(prev),
      categoryBreakdown(month),
      listExpenses({ month }),
    ]);
    setData({ total, prevTotal, slices: toSlices(breakdown, total), expenses });
  }, [month.year, month.month]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void load();
    void syncNow().then((r) => {
      if (r.pulled > 0) void load();
    });
    const stop = startNetworkSyncTrigger();
    return stop;
  }, [load]);

  // Reload when returning from capture/draft/edit (token bumped by the shell).
  useEffect(() => {
    if (reloadToken > 0) void load();
  }, [reloadToken, load]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      requestSync(0);
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  if (!data) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  const deltaPct =
    data.prevTotal > 0 && data.total > data.prevTotal
      ? Math.round(((data.total - data.prevTotal) / data.prevTotal) * 100)
      : null;

  const chips = [ALL, ...data.slices.map((s) => s.name)];
  const filtered =
    selected === ALL
      ? data.expenses
      : data.expenses.filter((e) => e.category === selected);
  const recent = filtered.slice(0, RECENT_LIMIT);
  const empty = data.expenses.length === 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.wrap,
          { paddingTop: insets.top + 17, paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <MonthTotal
          label={formatMonthLabel(month.year, month.month)}
          total={data.total}
          deltaPct={deltaPct}
          deltaLabel={`vs ${formatMonthLabel(prev.year, prev.month).split(" ")[0]}`}
          reduceMotion={reduceMotion}
        />

        {empty ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptyBody}>
              Tap Add expense to capture your first one.
            </Text>
          </View>
        ) : (
          <>
            {data.slices.length > 0 && (
              <SummaryCard slices={data.slices} reduceMotion={reduceMotion} />
            )}
            {chips.length > 1 && (
              <CategoryChips
                chips={chips}
                selected={selected}
                onSelect={setSelected}
                reduceMotion={reduceMotion}
              />
            )}
            <View style={styles.listhead}>
              <Text style={styles.h2}>Recent</Text>
              <Text style={styles.count}>
                {filtered.length} {filtered.length === 1 ? "expense" : "expenses"}
              </Text>
            </View>
            {recent.length > 0 ? (
              <RecentCard expenses={recent} onPressRow={onEditExpense} />
            ) : (
              <Text style={styles.noneInFilter}>No {selected} expenses.</Text>
            )}
          </>
        )}
      </ScrollView>

      <Fab onPress={onAddExpense} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  center: { alignItems: "center", justifyContent: "center" },
  wrap: { paddingHorizontal: space.inset },
  listhead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: space.section,
  },
  h2: { ...type.title, color: colors.ink },
  count: { fontFamily: type.caption.fontFamily, fontSize: 12, color: colors.muted },
  noneInFilter: {
    fontFamily: type.caption.fontFamily,
    fontSize: 12,
    color: colors.muted,
    marginTop: 16,
  },
  emptyBox: { marginTop: 48, alignItems: "center", gap: 6 },
  emptyTitle: { ...type.title, color: colors.ink },
  emptyBody: {
    fontFamily: type.caption.fontFamily,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
});

