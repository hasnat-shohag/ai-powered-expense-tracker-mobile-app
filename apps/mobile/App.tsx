import { useCallback } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppFonts } from "./src/theme/fonts";
import { colors } from "./src/theme";
import { HomeScreen } from "./src/screens/home/HomeScreen";

/**
 * App shell: loads the bilingual fonts, then renders the Home screen. The local
 * SQLite database migrates lazily on first query (see db/database.ts), so no
 * explicit init step is needed here. The capture/draft flow (FAB target) lands
 * in a later phase; for now the FAB acknowledges the tap.
 */
export function App() {
  const [fontsLoaded, fontError] = useAppFonts();

  const onAddExpense = useCallback(() => {
    Alert.alert("Add expense", "The capture flow arrives in a later phase.");
  }, []);

  if (!fontsLoaded && !fontError) {
    return <View style={styles.splash} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <HomeScreen onAddExpense={onAddExpense} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.ground },
});
