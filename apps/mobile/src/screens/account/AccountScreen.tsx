import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import { colors, radius, space, type } from "../../theme";
import { PrimaryButton, TextField, TopBar } from "../../ui/controls";
import { AuthError, getMe, patchMe } from "../../api/client";

type Load =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

/**
 * Account / profile. Email + avatar come from Clerk; the editable fields
 * (display name, timezone) are our own, fetched from `GET /me` and saved via
 * `PATCH /me`. Requires network — profile lives server-side, not in the local
 * mirror.
 */
export function AccountScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [saving, setSaving] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress ?? user?.id ?? "";
  const avatar = user?.imageUrl;

  const fetchMe = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const me = await getMe();
      setDisplayName(me.user.displayName);
      setTimezone(me.user.timezone);
      setLoad({ kind: "ready" });
    } catch (err) {
      setLoad({ kind: "error", message: messageFor(err) });
    }
  }, []);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const me = await patchMe({
        displayName: displayName.trim() || undefined,
        timezone: timezone.trim() || undefined,
      });
      setDisplayName(me.user.displayName);
      setTimezone(me.user.timezone);
      onClose();
    } catch (err) {
      Alert.alert("Couldn't save", messageFor(err));
    } finally {
      setSaving(false);
    }
  }, [displayName, timezone, onClose]);

  const dirty = load.kind === "ready";
  const valid = displayName.trim().length > 0 && timezone.trim().length > 0;

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar title="Account" onBack={onClose} />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.identity}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {(displayName || email || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
          </View>

          {load.kind === "loading" && (
            <ActivityIndicator color={colors.muted} style={styles.center} />
          )}
          {load.kind === "error" && (
            <Text style={styles.err}>{load.message}</Text>
          )}
          {dirty && (
            <View style={styles.form}>
              <TextField
                label="Display name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
              />
              <TextField
                label="Timezone"
                value={timezone}
                onChangeText={setTimezone}
                placeholder="Asia/Dhaka"
              />
              <Text style={styles.hint}>
                Timezone groups your spending by day in Insights.
              </Text>
            </View>
          )}
        </ScrollView>
        {dirty && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <PrimaryButton
              label="Save changes"
              onPress={onSave}
              disabled={!valid}
              loading={saving}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function messageFor(err: unknown): string {
  if (err instanceof AuthError) return "Session rejected. Sign out and back in.";
  return err instanceof Error ? err.message : "Something went wrong.";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  flex: { flex: 1 },
  body: { padding: space.inset, gap: space.section },
  identity: { alignItems: "center", gap: 10, marginTop: 8 },
  avatar: { width: 72, height: 72, borderRadius: radius.full },
  avatarFallback: {
    backgroundColor: colors.fillTrack,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontFamily: type.display.fontFamily, fontSize: 28, color: colors.ink },
  email: { fontFamily: type.body.fontFamily, fontSize: 14, color: colors.muted },
  center: { marginTop: 24 },
  form: { gap: space.gap },
  hint: { fontFamily: type.caption.fontFamily, fontSize: 12, color: colors.muted },
  err: { fontFamily: type.body.fontFamily, fontSize: 14, color: "#B42318" },
  footer: {
    paddingHorizontal: space.inset,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.ground,
  },
});
