import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

/**
 * Placeholder shell. Real screens (Capture, Draft review, List, Edit) are built
 * in Phases 7–12, after the `/impeccable` design phase (Phase 6) sets the visual
 * direction, design system, and approved mockups.
 */
export function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expense Tracker</Text>
      <Text style={styles.subtitle}>Scaffold ready — UI awaits the design phase.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: "600" },
  subtitle: { marginTop: 8, opacity: 0.6, textAlign: "center" },
});
