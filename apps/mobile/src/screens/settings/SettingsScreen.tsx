import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { colors, radius, space, type } from "../../theme";
import { TopBar, GhostButton } from "../../ui/controls";
import { API_BASE_URL, isApiConfigured } from "../../config";
import { AuthError, checkHealth } from "../../api/client";
import { wipeLocalData } from "../../auth/wipe";

type Status =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; db: string }
  | { kind: "error"; message: string };

/**
 * Settings: the signed-in account and backend connection. Sign-out wipes the
 * local mirror (the only on-device tenant boundary) — the server is the source
 * of truth, so the next sign-in re-pulls. "Test connection" hits /api/health
 * with the live Clerk session token, so it only works while signed in.
 */
export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const email = user?.primaryEmailAddress?.emailAddress ?? user?.id ?? "Signed in";

  const doSignOut = useCallback(async () => {
    setBusy(true);
    try {
      await signOut();
      await wipeLocalData();
    } finally {
      setBusy(false);
    }
  }, [signOut]);

  const test = useCallback(async () => {
    setStatus({ kind: "testing" });
    try {
      const r = await checkHealth();
      setStatus({ kind: "ok", db: r.db });
    } catch (err) {
      const message =
        err instanceof AuthError
          ? "Session rejected (401). Sign out and back in."
          : err instanceof Error
            ? err.message
            : "Connection failed.";
      setStatus({ kind: "error", message });
    }
  }, []);

  const configured = isApiConfigured();

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar title="Settings" onBack={onClose} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingBottom: insets.bottom + 24 }]}
      >
        <Text style={styles.section}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>Signed in as</Text>
          <Text style={styles.rowValue} numberOfLines={1}>
            {email}
          </Text>
          <GhostButton
            label={busy ? "Signing out…" : "Sign out"}
            tone="danger"
            onPress={doSignOut}
          />
        </View>

        <Text style={styles.section}>Backend</Text>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>API URL</Text>
          <Text style={styles.rowValue} numberOfLines={2}>
            {configured ? API_BASE_URL : "Not configured"}
          </Text>
          {!configured && (
            <Text style={styles.hint}>
              Set expo.extra.apiBaseUrl in app.json to your Vercel deployment.
            </Text>
          )}
        </View>

        <Text style={styles.section}>Connection</Text>
        <View style={styles.card}>
          <GhostButton label="Test connection" onPress={test} />
          {status.kind === "testing" && (
            <Text style={styles.rowValue}>Checking…</Text>
          )}
          {status.kind === "ok" && (
            <Text style={[styles.rowValue, styles.ok]}>
              Connected. Database {status.db}.
            </Text>
          )}
          {status.kind === "error" && (
            <Text style={[styles.rowValue, styles.err]}>{status.message}</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  wrap: { paddingHorizontal: space.inset, paddingTop: space.section, gap: 10 },
  section: { ...type.label, color: colors.muted, marginTop: 12 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    padding: 14,
    gap: 12,
  },
  rowLabel: { ...type.label, color: colors.muted },
  rowValue: { fontFamily: type.body.fontFamily, fontSize: 14, color: colors.ink },
  hint: { fontFamily: type.caption.fontFamily, fontSize: 12, color: colors.muted },
  ok: { color: colors.positiveGreen },
  err: { color: "#B42318" },
});
