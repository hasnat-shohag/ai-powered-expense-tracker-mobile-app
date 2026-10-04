import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { listPendingCaptures, removePendingCaptures, updatePendingCaptureText, type PendingCapture } from "../../db";
import { ApiError } from "../../api/client";
import { colors, radius, shadow, space, type } from "../../theme";
import { CameraIcon, ImageIcon, MicIcon, TextIcon, TrashIcon, SendIcon, CheckIcon } from "../../ui/icons";
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

function QueuedCaptureRow({
  c,
  isFirst,
  onRemove,
  onUpdateText,
}: {
  c: PendingCapture;
  isFirst: boolean;
  onRemove: (c: PendingCapture) => void;
  onUpdateText: (id: string, text: string) => void;
}) {
  const [val, setVal] = useState(c.rawText || "");
  const [focused, setFocused] = useState(false);

  const handleBlur = () => {
    setFocused(false);
    onUpdateText(c.id, val);
  };

  const handleSave = () => {
    Keyboard.dismiss();
  };

  return (
    <View style={[styles.qRow, !isFirst && styles.qRowDivider]}>
      <View style={styles.qTile}>
        <SourceIcon source={c.source} />
      </View>
      {c.source === "image" ? (
        <Text style={styles.qText} numberOfLines={2}>
          Receipt photo
        </Text>
      ) : (
        <TextInput
          style={styles.qInput}
          value={val}
          onChangeText={setVal}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          multiline
          placeholder="(empty)"
          placeholderTextColor={colors.muted}
          selectionColor={colors.actionBlue}
        />
      )}
      {focused ? (
        <Pressable
          onPress={handleSave}
          hitSlop={10}
          android_ripple={{ color: colors.line, borderless: true }}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
        >
          <CheckIcon color={colors.actionBlue} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => onRemove(c)}
          hitSlop={10}
          android_ripple={{ color: colors.line, borderless: true }}
          accessibilityRole="button"
          accessibilityLabel="Remove capture"
        >
          <TrashIcon color="#B42318" />
        </Pressable>
      )}
    </View>
  );
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

  const updateCaptureText = async (id: string, newText: string) => {
    if (!newText.trim()) return; // avoid saving completely empty strings unless intended.
    await updatePendingCaptureText(id, newText.trim());
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
          <View style={[styles.composer, listening && styles.composerListening]}>
            <TextInput
              style={[styles.composerInput, listening && { display: 'none' }]}
              value={text}
              onChangeText={setText}
              placeholder="e.g. lunch 320 at Star Kabab, cash"
              placeholderTextColor={colors.muted}
              multiline
              autoFocus
              selectionColor={colors.actionBlue}
            />
            {listening && (
              <View style={styles.composerInput}>
                <Text style={styles.composerTranscript}>
                  {transcript || "Listening…"}
                </Text>
              </View>
            )}
            
            <View style={styles.composerToolbar}>
              <View style={styles.composerRow}>
                <Pressable
                  style={styles.composerIconBtn}
                  onPress={toggleVoice}
                  hitSlop={8}
                >
                  <MicIcon color={listening ? colors.actionBlue : colors.ink} size={22} />
                </Pressable>
                <Pressable
                  style={styles.composerIconBtn}
                  onPress={() => addImage(true)}
                  hitSlop={8}
                >
                  <CameraIcon color={colors.ink} size={22} />
                </Pressable>
                <Pressable
                  style={styles.composerIconBtn}
                  onPress={() => addImage(false)}
                  hitSlop={8}
                >
                  <ImageIcon color={colors.ink} size={22} />
                </Pressable>
              </View>

              {(text.trim().length > 0 || listening) && (
                <Pressable
                  style={[
                    styles.composerSendBtn,
                    listening && styles.composerSendBtnStop
                  ]}
                  onPress={listening ? toggleVoice : addText}
                  hitSlop={8}
                >
                  {listening ? (
                    <Text style={styles.composerStopText}>Stop</Text>
                  ) : (
                    <SendIcon color={colors.ground} size={16} />
                  )}
                </Pressable>
              )}
            </View>
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
                  <QueuedCaptureRow
                    key={c.id}
                    c={c}
                    isFirst={i === 0}
                    onRemove={removeCapture}
                    onUpdateText={updateCaptureText}
                  />
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
  composer: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSunken,
    overflow: "hidden",
  },
  composerListening: {
    borderColor: colors.actionBlue,
  },
  composerInput: {
    minHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: type.body.fontFamily,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: "top",
  },
  composerTranscript: {
    fontFamily: type.body.fontFamily,
    fontSize: 15,
    color: colors.ink,
    fontStyle: "italic",
  },
  composerToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  composerIconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  composerSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.actionBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  composerSendBtnStop: {
    width: 'auto',
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  composerStopText: {
    fontFamily: type.body.fontFamily,
    fontSize: 13,
    color: colors.ground,
    fontWeight: "bold",
  },
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
  qInput: {
    flex: 1,
    fontFamily: type.body.fontFamily,
    fontSize: 14,
    color: colors.ink,
    padding: 0,
    margin: 0,
    minHeight: 20,
    textAlignVertical: "center",
  },
  footer: {
    paddingHorizontal: space.inset,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.ground,
  },
});



