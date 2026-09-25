import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space, type } from "../../theme";
import { TopBar, PrimaryButton, GhostButton, TextField } from "../../ui/controls";
import { API_BASE_URL, isApiConfigured } from "../../config";
import { clearToken, getToken, setToken } from "../../auth/token";
import { AuthError, checkHealth } from "../../api/client";

type Status =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; db: string }
  | { kind: "error"; message: string };

/**
 * Settings: where the single static bearer token is entered and stored in the
 * OS keystore (SecureStore) — it never lives in env or the JS bundle. Shows the
 * configured backend origin (public, no secret) and a "Test connection" that
 * hits /api/health with the saved token so a bad URL or token is caught before
 * a real capture. Rotating the token = paste a new value and Save.
 */
export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [token, setTokenText] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    void getToken().then((t) => setHasSaved(t !== null));
  }, []);

  const save = useCallback(async () => {
    const value = token.trim();
    if (!value) return;
    setBusy(true);
    try {
      await setToken(value);
      setHasSaved(true);
      setTokenText("");
      setStatus({ kind: "idle" });
    } finally {
      setBusy(false);
    }
  }, [token]);

  const clear = useCallback(async () => {
    setBusy(true);
    try {
      await clearToken();
      setHasSaved(false);
      setTokenText("");
      setStatus({ kind: "idle" });
    } finally {
      setBusy(false);
    }
  }, []);

  const test = useCallback(async () => {
    setStatus({ kind: "testing" });
    try {
      const r = await checkHealth();
      setStatus({ kind: "ok", db: r.db });
    } catch (err) {
      const message =
        err instanceof AuthError
          ? "Token rejected (401). Check the value."
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.wrap,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
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

          <Text style={styles.section}>API token</Text>
          <View style={styles.card}>
            <Text style={styles.rowValue}>
              {hasSaved ? "A token is stored on this device." : "No token stored."}
            </Text>
            <TextField
              label={hasSaved ? "Replace token" : "Bearer token"}
              value={token}
              onChangeText={setTokenText}
              placeholder="Paste the API_BEARER_TOKEN value"
            />
            <PrimaryButton
              label={hasSaved ? "Update token" : "Save token"}
              onPress={save}
              disabled={token.trim().length === 0}
              loading={busy}
            />
            {hasSaved && <GhostButton label="Remove token" tone="danger" onPress={clear} />}
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  flex: { flex: 1 },
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
