import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, shadow, type } from "../../theme";
import { PlusIcon } from "../../ui/icons";

/**
 * FAB "Add expense": the one confident gesture on a calm page. Full pill,
 * Action Blue fill, white text + plus icon, the blue-tinted FAB lift. Floats
 * 20px from the right and 28px from the bottom. Presses depress slightly and
 * ripple (M3 state layer).
 */
export function Fab({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (v: number) =>
    Animated.timing(scale, {
      toValue: v,
      duration: 100,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}>
      <Pressable
        style={styles.fab}
        onPress={onPress}
        onPressIn={() => to(0.97)}
        onPressOut={() => to(1)}
        android_ripple={{ color: "rgba(255,255,255,0.24)", borderless: false }}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
      >
        <PlusIcon color={colors.ground} />
        <Text style={styles.label}>Add expense</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 20,
    bottom: 28,
    borderRadius: radius.full,
    ...shadow.fab,
  },
  fab: {
    height: 52,
    paddingHorizontal: 22,
    borderRadius: radius.full,
    backgroundColor: colors.actionBlue,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    overflow: "hidden",
  },
  label: { fontFamily: type.body.fontFamily, fontSize: 14.5, color: colors.ground },
});
