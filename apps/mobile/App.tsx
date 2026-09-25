import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Expense } from "@expense/shared";
import { useAppFonts } from "./src/theme/fonts";
import { colors } from "./src/theme";
import { HomeScreen } from "./src/screens/home/HomeScreen";
import { CaptureScreen } from "./src/screens/capture/CaptureScreen";
import { DraftScreen } from "./src/screens/draft/DraftScreen";
import { EditExpenseScreen } from "./src/screens/edit/EditExpenseScreen";
import type { Draft } from "./src/drain";

/** The app is a small stack: Home is the root; capture/draft/edit push over it. */
type Route =
  | { name: "home" }
  | { name: "capture" }
  | { name: "draft"; draft: Draft }
  | { name: "edit"; expense: Expense };

/**
 * App shell: loads the bilingual fonts, then drives a tiny hand-rolled screen
 * stack (no navigation dep — four screens, one level deep). Home reads local
 * SQLite; returning from any child bumps a reload token so the ledger reflects
 * the new/edited rows. The DB migrates lazily on first query (db/database.ts).
 */
export function App() {
  const [fontsLoaded, fontError] = useAppFonts();
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [reloadToken, setReloadToken] = useState(0);

  const goHome = useCallback(() => {
    setReloadToken((n) => n + 1);
    setRoute({ name: "home" });
  }, []);

  if (!fontsLoaded && !fontError) {
    return <View style={styles.splash} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {route.name === "home" && (
        <HomeScreen
          reloadToken={reloadToken}
          onAddExpense={() => setRoute({ name: "capture" })}
          onEditExpense={(expense) => setRoute({ name: "edit", expense })}
        />
      )}
      {route.name === "capture" && (
        <CaptureScreen
          onClose={() => setRoute({ name: "home" })}
          onDraftReady={(draft) => setRoute({ name: "draft", draft })}
        />
      )}
      {route.name === "draft" && (
        <DraftScreen
          draft={route.draft}
          onCancel={() => setRoute({ name: "home" })}
          onSaved={goHome}
        />
      )}
      {route.name === "edit" && (
        <EditExpenseScreen expense={route.expense} onClose={goHome} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.ground },
});
