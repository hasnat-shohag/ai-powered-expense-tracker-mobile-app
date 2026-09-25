import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Expense } from "@expense/shared";
import { colors, space } from "../../theme";
import { deleteExpense, editExpense } from "../../services/expenses";
import { GhostButton, PrimaryButton, TopBar } from "../../ui/controls";
import { ExpenseForm, type ExpenseEdits } from "./ExpenseForm";

/**
 * Edit or delete one confirmed expense. Writes go through the offline-first
 * service (local SQLite immediately + debounced sync). Save is disabled until
 * the row has an amount and a category, the two fields the ledger cannot show
 * without.
 */
export function EditExpenseScreen({
  expense,
  onClose,
}: {
  expense: Expense;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [working, setWorking] = useState<Expense>(expense);
  const [busy, setBusy] = useState(false);

  const patch = (p: Partial<ExpenseEdits>) =>
    setWorking((w) => ({ ...w, ...p }));

  const valid = working.amount > 0 && working.category.trim().length > 0;

  const onSave = async () => {
    setBusy(true);
    try {
      await editExpense(expense.id, {
        amount: working.amount,
        category: working.category.trim(),
        merchant: working.merchant.trim(),
        description: working.description.trim(),
        paymentMethod: working.paymentMethod,
      });
      onClose();
    } catch (e) {
      setBusy(false);
      Alert.alert("Couldn't save", String(e instanceof Error ? e.message : e));
    }
  };

  const onDelete = () => {
    Alert.alert("Delete expense?", "This removes it from your ledger.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await deleteExpense(expense.id);
            onClose();
          } catch (e) {
            setBusy(false);
            Alert.alert("Couldn't delete", String(e instanceof Error ? e.message : e));
          }
        },
      },
    ]);
  };
// APPEND_EDIT
  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top }} />
      <TopBar title="Edit expense" onBack={onClose} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <ExpenseForm value={working} onChange={patch} />
          <View style={styles.deleteWrap}>
            <GhostButton label="Delete expense" tone="danger" onPress={onDelete} />
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <PrimaryButton
            label="Save changes"
            onPress={onSave}
            disabled={!valid}
            loading={busy}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  flex: { flex: 1 },
  body: { padding: space.inset, gap: space.section },
  deleteWrap: { marginTop: 4 },
  footer: {
    paddingHorizontal: space.inset,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.ground,
  },
});

