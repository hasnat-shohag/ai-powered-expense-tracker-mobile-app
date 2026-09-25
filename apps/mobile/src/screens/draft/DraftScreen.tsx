import { useState } from "react";
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
import type { Expense } from "@expense/shared";
import type { Draft } from "../../drain";
import { saveDraft } from "../../drain";
import { colors, radius, shadow, space, tabular, type } from "../../theme";
import { formatTaka } from "../../format";
import { TrashIcon } from "../../ui/icons";
import { PrimaryButton, TopBar } from "../../ui/controls";
import { ExpenseForm, type ExpenseEdits } from "../edit/ExpenseForm";

/**
 * Draft review: the single combined, editable list across every drained
 * capture. The LLM's rows are never trusted blindly — the user corrects any
 * field, drops rows that shouldn't exist, then Saves. Saving writes the kept
 * rows to local SQLite + outbox and clears the drained captures/images.
 */
export function DraftScreen({
  draft,
  onSaved,
  onCancel,
}: {
  draft: Draft;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Expense[]>(draft.items);
  const [busy, setBusy] = useState(false);

  const patch = (id: string, p: Partial<ExpenseEdits>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const remove = (id: string) =>
    setItems((xs) => xs.filter((x) => x.id !== id));

  const total = items.reduce((s, x) => s + (x.amount || 0), 0);
  const valid =
    items.length > 0 &&
    items.every((x) => x.amount > 0 && x.category.trim().length > 0);

  const save = async () => {
    setBusy(true);
    try {
      const clean = items.map((x) => ({
        ...x,
        category: x.category.trim(),
        merchant: x.merchant.trim(),
        description: x.description.trim(),
      }));
      await saveDraft(clean, draft);
      onSaved();
    } catch (e) {
      setBusy(false);
      Alert.alert("Couldn't save", String(e instanceof Error ? e.message : e));
    }
  };
// APPEND_DRAFT
  const empty = items.length === 0;

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top }} />
      <TopBar
        title="Review draft"
        onBack={onCancel}
        right={!empty ? <Text style={styles.total}>{formatTaka(total)}</Text> : undefined}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {empty ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Nothing to save</Text>
              <Text style={styles.emptyBody}>
                No rows came back to review. Go back and add a capture.
              </Text>
            </View>
          ) : (
            items.map((item, i) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardIndex}>Item {i + 1}</Text>
                  <Pressable
                    onPress={() => remove(item.id)}
                    hitSlop={10}
                    android_ripple={{ color: colors.line, borderless: true }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove item ${i + 1}`}
                  >
                    <TrashIcon color="#B42318" />
                  </Pressable>
                </View>
                <ExpenseForm value={item} onChange={(p) => patch(item.id, p)} />
              </View>
            ))
          )}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <PrimaryButton
            label={empty ? "Nothing to save" : `Save ${items.length} ${items.length === 1 ? "expense" : "expenses"}`}
            onPress={save}
            disabled={!valid}
            loading={busy}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
// APPEND_DRAFT_STYLES
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  flex: { flex: 1 },
  body: { padding: space.inset, gap: space.gap },
  total: {
    ...tabular,
    fontFamily: type.body.fontFamily,
    fontSize: 14,
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.ground,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.padCard,
    gap: space.gap,
    ...shadow.card,
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardIndex: { ...type.label, color: colors.muted },
  emptyBox: { marginTop: 48, alignItems: "center", gap: 6 },
  emptyTitle: { ...type.title, color: colors.ink },
  emptyBody: {
    fontFamily: type.caption.fontFamily,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: space.inset,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.ground,
  },
});


