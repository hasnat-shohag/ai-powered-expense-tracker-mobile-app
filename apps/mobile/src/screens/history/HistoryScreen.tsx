import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Expense } from "@expense/shared";
import {
  distinctCategories,
  distinctPaymentMethods,
  searchExpenses,
  type ExpenseFilters,
} from "../../db";
import { colors, radius, space, type } from "../../theme";
import { TopBar, TextField } from "../../ui/controls";
import { CategoryChips } from "../home/CategoryChips";
import { RecentCard } from "../home/RecentCard";

const PAGE = 30;
const ALL = "All";

/**
 * History: the full ledger with free-text search and category / payment-method
 * filters, keyset-paginated ("Load more"). Reads local SQLite only
 * (offline-first), so it works with no network and stays consistent with Home.
 */
export function HistoryScreen({
  onEditExpense,
  onClose,
}: {
  onEditExpense?: (e: Expense) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [payment, setPayment] = useState(ALL);
  const [categories, setCategories] = useState<string[]>([]);
  const [payments, setPayments] = useState<string[]>([]);

  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    void distinctCategories().then(setCategories);
    void distinctPaymentMethods().then(setPayments);
  }, []);

  const filters = useCallback((): ExpenseFilters => {
    const f: ExpenseFilters = {};
    if (search.trim()) f.search = search.trim();
    if (category !== ALL) f.category = category;
    if (payment !== ALL) f.paymentMethod = payment;
    return f;
  }, [search, category, payment]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    const rows = await searchExpenses(filters(), PAGE);
    if (id !== reqId.current) return; // a newer query superseded this one
    setItems(rows);
    setHasMore(rows.length === PAGE);
    setLoading(false);
  }, [filters]);

  // Debounce re-querying as the search text / filters change.
  useEffect(() => {
    const t = setTimeout(() => void load(), 220);
    return () => clearTimeout(t);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || items.length === 0) return;
    setLoadingMore(true);
    try {
      const cursor = items[items.length - 1]!.spentAt;
      const more = await searchExpenses(filters(), PAGE, cursor);
      setItems((prev) => [...prev, ...more]);
      setHasMore(more.length === PAGE);
    } finally {
      setLoadingMore(false);
    }
  }, [filters, items, loadingMore]);

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar title="History" onBack={onClose} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.wrap,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Search"
          value={search}
          onChangeText={setSearch}
          placeholder="Merchant, note, category…"
        />

        <CategoryChips
          chips={[ALL, ...categories]}
          selected={category}
          onSelect={setCategory}
          reduceMotion={false}
        />
        {payments.length > 0 && (
          <CategoryChips
            chips={[ALL, ...payments]}
            selected={payment}
            onSelect={setPayment}
            reduceMotion={false}
          />
        )}

        {loading ? (
          <ActivityIndicator color={colors.muted} style={styles.center} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>No expenses match these filters.</Text>
        ) : (
          <>
            <RecentCard expenses={items} onPressRow={onEditExpense} />
            {hasMore && (
              <Pressable
                style={styles.more}
                onPress={loadMore}
                android_ripple={{ color: colors.line }}
              >
                {loadingMore ? (
                  <ActivityIndicator color={colors.muted} />
                ) : (
                  <Text style={styles.moreLabel}>Load more</Text>
                )}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  wrap: { paddingHorizontal: space.inset, paddingTop: space.gap, gap: 4 },
  center: { marginTop: 32 },
  empty: {
    fontFamily: type.caption.fontFamily,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    marginTop: 32,
  },
  more: {
    height: 48,
    marginTop: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  moreLabel: { fontFamily: type.body.fontFamily, fontSize: 14, color: colors.ink },
});
