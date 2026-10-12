import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SubscriptionResponse } from "@expense/shared";
import { colors, radius, space, type } from "../../theme";
import { TopBar } from "../../ui/controls";
import { AuthError, getSubscription } from "../../api/client";
import { formatDay } from "../../format";

type Load =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: SubscriptionResponse };

/**
 * Subscription / plan — read-only. Shows the current plan, status, billing
 * period (when a provider populates it), and the capabilities the plan grants.
 * Plan changes are admin-granted on the backend; there is no payment UI yet.
 */
export function SubscriptionScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [load, setLoad] = useState<Load>({ kind: "loading" });

  const fetch = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const data = await getSubscription();
      setLoad({ kind: "ready", data });
    } catch (err) {
      const message =
        err instanceof AuthError
          ? "Session rejected. Sign out and back in."
          : err instanceof Error
            ? err.message
            : "Couldn't load subscription.";
      setLoad({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar title="Subscription" onBack={onClose} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.wrap,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {load.kind === "loading" && (
          <ActivityIndicator color={colors.muted} style={styles.center} />
        )}
        {load.kind === "error" && <Text style={styles.err}>{load.message}</Text>}
        {load.kind === "ready" && <SubscriptionBody data={load.data} />}
      </ScrollView>
    </View>
  );
}

function SubscriptionBody({ data }: { data: SubscriptionResponse }) {
  const { subscription: s, entitlements: e } = data;
  const caps: { label: string; on: boolean | string }[] = [
    {
      label: "Expenses per month",
      on: e.maxExpensesPerMonth == null ? "Unlimited" : String(e.maxExpensesPerMonth),
    },
    { label: "Voice capture", on: e.voiceCapture },
    { label: "Receipt photos", on: e.receiptImage },
    { label: "Analytics", on: e.analytics },
  ];

  return (
    <>
      <View style={styles.planCard}>
        <View style={styles.planHead}>
          <Text style={styles.planName}>{s.plan.toUpperCase()}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{s.status}</Text>
          </View>
        </View>
        {s.currentPeriodEnd ? (
          <Text style={styles.period}>
            {s.cancelAtPeriodEnd ? "Ends" : "Renews"} {formatDay(s.currentPeriodEnd)}
          </Text>
        ) : (
          <Text style={styles.period}>No billing period — free plan.</Text>
        )}
      </View>

      <Text style={styles.section}>Plan includes</Text>
      <View style={styles.card}>
        {caps.map((c, i) => (
          <View key={c.label} style={[styles.capRow, i > 0 && styles.divided]}>
            <Text style={styles.capLabel}>{c.label}</Text>
            <Text style={styles.capValue}>
              {typeof c.on === "string" ? c.on : c.on ? "Included" : "—"}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        Plan changes are managed by an administrator.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  wrap: { paddingHorizontal: space.inset, paddingTop: space.section, gap: 10 },
  center: { marginTop: 32 },
  err: { fontFamily: type.body.fontFamily, fontSize: 14, color: "#B42318" },
  planCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSunken,
    padding: space.padCard,
    gap: 8,
  },
  planHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  planName: {
    fontFamily: type.display.fontFamily,
    fontSize: 24,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  statusPill: {
    marginLeft: "auto",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: colors.fillTrack,
  },
  statusText: { ...type.label, color: colors.chipOffInk, textTransform: "capitalize" },
  period: { fontFamily: type.caption.fontFamily, fontSize: 12, color: colors.muted },
  section: { ...type.label, color: colors.muted, marginTop: 16 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  capRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  divided: { borderTopWidth: 1, borderTopColor: colors.line },
  capLabel: { fontFamily: type.body.fontFamily, fontSize: 14, color: colors.ink },
  capValue: { fontFamily: type.body.fontFamily, fontSize: 14, color: colors.muted },
  note: {
    fontFamily: type.caption.fontFamily,
    fontSize: 12,
    color: colors.muted,
    marginTop: 12,
  },
});
