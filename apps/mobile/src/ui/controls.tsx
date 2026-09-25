import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { colors, radius, space, type } from "../theme";
import { ChevronLeftIcon } from "./icons";

/**
 * Shared controls for the capture / draft / edit surfaces, drawn from the same
 * tokens as Home ("The Calm Ledger"): white ground, hairline dividers, a single
 * Action-Blue affordance, dense 12–15px type. Kept deliberately plain so the
 * one loud gesture on any screen stays the primary button.
 */

/** Screen header: back chevron · centered title · optional right slot. */
export function TopBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.topbar}>
      <View style={styles.topSlot}>
        {onBack && (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            android_ripple={{ color: colors.line, borderless: true }}
          >
            <ChevronLeftIcon color={colors.ink} />
          </Pressable>
        )}
      </View>
      <Text style={styles.topTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.topSlot, styles.topRight]}>{right}</View>
    </View>
  );
}
/** The one confident action on a screen: full-width Action-Blue pill. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      style={[styles.primary, off && styles.primaryOff]}
      onPress={off ? undefined : onPress}
      android_ripple={off ? undefined : { color: "rgba(255,255,255,0.24)" }}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(off) }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={colors.ground} />
      ) : (
        <Text style={styles.primaryLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Quiet secondary action: hairline outline, ink text, no fill. */
export function GhostButton({
  label,
  onPress,
  tone = "ink",
}: {
  label: string;
  onPress: () => void;
  tone?: "ink" | "danger";
}) {
  const color = tone === "danger" ? "#B42318" : colors.ink;
  return (
    <Pressable
      style={styles.ghost}
      onPress={onPress}
      android_ripple={{ color: colors.line }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.ghostLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}
/** Labeled text input on a sunken field, hairline border, ink text. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        autoFocus={autoFocus}
        selectionColor={colors.actionBlue}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  topbar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.inset,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  topSlot: { width: 40, justifyContent: "center" },
  topRight: { alignItems: "flex-end" },
  topTitle: { ...type.title, color: colors.ink, flex: 1, textAlign: "center" },
  primary: {
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.actionBlue,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  primaryOff: { backgroundColor: "#93B4F6" },
  primaryLabel: {
    fontFamily: type.body.fontFamily,
    fontSize: 15,
    color: colors.ground,
  },
  ghost: {
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ghostLabel: { fontFamily: type.body.fontFamily, fontSize: 14 },
  fieldWrap: { gap: 6 },
  fieldLabel: { ...type.label, color: colors.muted },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: type.body.fontFamily,
    fontSize: 15,
    color: colors.ink,
  },
  inputMulti: { minHeight: 96, textAlignVertical: "top" },
});



