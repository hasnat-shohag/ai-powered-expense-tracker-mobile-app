import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { drainAndParse, type Draft } from "../../drain";
import {
  captureReceiptFromLibrary,
  captureReceiptPhoto,
  captureText,
  captureVoiceTranscript,
  requestVoicePermission,
  startVoiceCapture,
  stopVoiceCapture,
  useVoiceEnd,
  useVoiceResult,
} from "../../capture";
import { pendingCount } from "../../db";
import { ApiError } from "../../api/client";
import { colors, radius, space, type } from "../../theme";
import { CameraIcon, ImageIcon, MicIcon } from "../../ui/icons";
import { GhostButton, PrimaryButton, TextField, TopBar } from "../../ui/controls";

/**
 * Capture: the three offline surfaces (type · speak · photograph) all writing
 * to the local pending queue, then one "Review" gesture drains everything
 * through /parse into an editable draft. Capture always works offline; only the
 * review step needs the network, and a failure there leaves every capture
 * queued so a retry is safe.
 */
export function CaptureScreen({
  onDraftReady,
  onClose,
}: {
  onDraftReady: (draft: Draft) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(0);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const refresh = useCallback(async () => setPending(await pendingCount()), []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
// APPEND_CAPTURE
  useVoiceResult((t) => setTranscript(t));
  useVoiceEnd(() => setListening(false));

  const addText = async () => {
    const raw = text.trim();
    if (!raw) return;
    await captureText(raw);
    setText("");
    void refresh();
  };

  const toggleVoice = async () => {
    if (listening) {
      stopVoiceCapture();
      setListening(false);
      const said = transcript.trim();
      if (said) {
        await captureVoiceTranscript(said);
        void refresh();
      }
      setTranscript("");
      return;
    }
    const ok = await requestVoicePermission();
    if (!ok) {
      Alert.alert("Microphone needed", "Allow microphone access to capture by voice.");
      return;
    }
    setTranscript("");
    setListening(true);
    startVoiceCapture();
  };

  const addImage = async (fromCamera: boolean) => {
    try {
      const id = fromCamera
        ? await captureReceiptPhoto()
        : await captureReceiptFromLibrary();
      if (id) void refresh();
    } catch (e) {
      Alert.alert("Couldn't add image", String(e instanceof Error ? e.message : e));
    }
  };

  const review = async () => {
    setReviewing(true);
    try {
      const draft = await drainAndParse();
      onDraftReady(draft);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 0
          ? "You're offline. Captures are saved — review when you're back online."
          : String(e instanceof Error ? e.message : e);
      Alert.alert("Couldn't parse captures", msg);
    } finally {
      setReviewing(false);
    }
  };
// APPEND_CAPTURE_2
  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top }} />
      <TopBar title="Add expense" onBack={onClose} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            label="Type it"
            value={text}
            onChangeText={setText}
            placeholder="e.g. lunch 320 at Star Kabab, cash"
            multiline
            autoFocus
          />
          <GhostButton label="Add to queue" onPress={addText} />

          <Pressable
            style={[styles.voice, listening && styles.voiceOn]}
            onPress={toggleVoice}
            android_ripple={{ color: colors.line }}
            accessibilityRole="button"
            accessibilityLabel={listening ? "Stop recording" : "Speak an expense"}
          >
            <MicIcon color={listening ? colors.ground : colors.ink} />
            <Text style={[styles.voiceLabel, listening && styles.voiceLabelOn]}>
              {listening ? "Listening… tap to stop" : "Speak an expense"}
            </Text>
          </Pressable>
          {listening && transcript ? (
            <Text style={styles.transcript}>{transcript}</Text>
          ) : null}

          <View style={styles.imgRow}>
            <Pressable style={styles.imgBtn} onPress={() => addImage(true)}
              android_ripple={{ color: colors.line }} accessibilityRole="button"
              accessibilityLabel="Photograph a receipt">
              <CameraIcon color={colors.ink} />
              <Text style={styles.imgLabel}>Photo</Text>
            </Pressable>
            <Pressable style={styles.imgBtn} onPress={() => addImage(false)}
              android_ripple={{ color: colors.line }} accessibilityRole="button"
              accessibilityLabel="Pick a receipt from the library">
              <ImageIcon color={colors.ink} />
              <Text style={styles.imgLabel}>Library</Text>
            </Pressable>
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <PrimaryButton
            label={pending > 0 ? `Review ${pending} ${pending === 1 ? "capture" : "captures"}` : "Nothing to review yet"}
            onPress={review}
            disabled={pending === 0}
            loading={reviewing}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
// APPEND_CAPTURE_STYLES
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  flex: { flex: 1 },
  body: { padding: space.inset, gap: space.gap },
  voice: {
    marginTop: 6,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSunken,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    overflow: "hidden",
  },
  voiceOn: { backgroundColor: colors.actionBlue, borderColor: colors.actionBlue },
  voiceLabel: { fontFamily: type.body.fontFamily, fontSize: 14, color: colors.ink },
  voiceLabelOn: { color: colors.ground },
  transcript: {
    fontFamily: type.caption.fontFamily,
    fontSize: 13,
    color: colors.muted,
    fontStyle: "italic",
  },
  imgRow: { flexDirection: "row", gap: space.gap, marginTop: 6 },
  imgBtn: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    overflow: "hidden",
  },
  imgLabel: { fontFamily: type.body.fontFamily, fontSize: 14, color: colors.ink },
  footer: {
    paddingHorizontal: space.inset,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.ground,
  },
});



