import { useCallback, useEffect, useRef, useState } from "react";
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
  deleteCaptureFile,
  requestVoicePermission,
  startVoiceCapture,
  stopVoiceCapture,
  useVoiceEnd,
  useVoiceError,
  useVoiceResult,
} from "../../capture";
import { listPendingCaptures, removePendingCaptures, type PendingCapture } from "../../db";
import { ApiError } from "../../api/client";
import { colors, radius, shadow, space, type } from "../../theme";
import { CameraIcon, ImageIcon, MicIcon, TextIcon, TrashIcon } from "../../ui/icons";
import { GhostButton, PrimaryButton, TextField, TopBar } from "../../ui/controls";

/**
 * Capture: the three offline surfaces (type · speak · photograph) all writing
 * to the local pending queue, then one "Review" gesture drains everything
 * through /parse into an editable draft. Capture always works offline; only the
 * review step needs the network, and a failure there leaves every capture
 * queued so a retry is safe.
 */
/** Source glyph shown on a queued capture's tile. */
function SourceIcon({ source }: { source: PendingCapture["source"] }) {
  if (source === "voice") return <MicIcon size={18} color={colors.ink} />;
  if (source === "image") return <ImageIcon size={18} color={colors.ink} />;
  return <TextIcon size={18} color={colors.ink} />;
}

export function CaptureScreen({
  onDraftReady,
  onClose,
}: {
  onDraftReady: (draft: Draft) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [captures, setCaptures] = useState<PendingCapture[]>([]);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const pending = captures.length;
  // Continuous recognition fires one final "result" per speech segment; keep the
  // committed finals so a multi-part utterance ("lunch 320 at Star Kabab cash")
  // is not overwritten by the last segment. `lastShownRef` is the latest text
  // displayed (committed + interim) so we can still capture something if only
  // interim results ever arrive. Capture happens on the `end` event, not on the
  // stop tap: the recognizer emits its most accurate final result slightly
  // AFTER stop(), so capturing synchronously on tap would save the interim.
  const committedRef = useRef("");
  const lastShownRef = useRef("");
  const [reviewing, setReviewing] = useState(false);

  const refresh = useCallback(async () => setCaptures(await listPendingCaptures()), []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useVoiceResult((t, isFinal) => {
    const said = t.trim();
    if (isFinal) {
      committedRef.current = committedRef.current ? `${committedRef.current} ${said}` : said;
    }
    const shown = isFinal
      ? committedRef.current
      : committedRef.current
        ? `${committedRef.current} ${t}`
        : t;
    lastShownRef.current = shown;
    setTranscript(shown);
  });
  useVoiceEnd(() => {
    setListening(false);
    const said = (committedRef.current || lastShownRef.current).trim();
    committedRef.current = "";
    lastShownRef.current = "";
    setTranscript("");
    // Preview the transcript into the "Type it" field rather than queuing it
    // raw: the recognizer mishears amounts and merchant names, so the user
    // gets to correct it and add it like any typed capture.
    if (said) setText((prev) => (prev.trim() ? `${prev.trim()} ${said}` : said));
  });
  useVoiceError((code, message) => {
    setListening(false);
    // "no-speech" just means silence — not worth an alert.
    if (code === "no-speech") return;
    Alert.alert("Voice unavailable", `${message} (${code})`);
  });

  const addText = async () => {
    const raw = text.trim();
    if (!raw) return;
    await captureText(raw);
    setText("");
    void refresh();
  };

  const toggleVoice = async () => {
    if (listening) {
      // Stop only. The final transcript arrives on the `end` event, which does
      // the capture — see useVoiceEnd above.
      stopVoiceCapture();
      setListening(false);
      return;
    }
    const ok = await requestVoicePermission();
    if (!ok) {
      Alert.alert("Microphone needed", "Allow microphone access to capture by voice.");
      return;
    }
    committedRef.current = "";
    lastShownRef.current = "";
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

  const removeCapture = async (c: PendingCapture) => {
    await removePendingCaptures([c.id]);
    if (c.imagePath) await deleteCaptureFile(c.imagePath);
    void refresh();
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

          <View style={styles.queue}>
            <Text style={styles.queueHead}>
              In queue{pending > 0 ? ` · ${pending}` : ""}
            </Text>
            {pending === 0 ? (
              <Text style={styles.queueEmpty}>
                Nothing queued yet. Type, speak, or snap a receipt above — each
                one lands here so you can check it before Review.
              </Text>
            ) : (
              <View style={styles.queueCard}>
                {captures.map((c, i) => (
                  <View
                    key={c.id}
                    style={[styles.qRow, i > 0 && styles.qRowDivider]}
                  >
                    <View style={styles.qTile}>
                      <SourceIcon source={c.source} />
                    </View>
                    <Text style={styles.qText} numberOfLines={2}>
                      {c.source === "image"
                        ? "Receipt photo"
                        : c.rawText || "(empty)"}
                    </Text>
                    <Pressable
                      onPress={() => removeCapture(c)}
                      hitSlop={10}
                      android_ripple={{ color: colors.line, borderless: true }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove capture ${i + 1}`}
                    >
                      <TrashIcon color="#B42318" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
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
  queue: { marginTop: space.gap, gap: space.gapTight },
  queueHead: { ...type.title, color: colors.ink },
  queueEmpty: {
    fontFamily: type.caption.fontFamily,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  queueCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.ground,
    overflow: "hidden",
    ...shadow.card,
  },
  qRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.gap,
    paddingVertical: 12,
    paddingHorizontal: space.padCard,
  },
  qRowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  qTile: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
  },
  qText: {
    flex: 1,
    fontFamily: type.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: space.inset,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.ground,
  },
});



