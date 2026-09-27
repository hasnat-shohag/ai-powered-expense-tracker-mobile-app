import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  useAuth,
} from "@clerk/clerk-expo";
import type { Expense } from "@expense/shared";
import { useAppFonts } from "./src/theme/fonts";
import { colors } from "./src/theme";
import { HomeScreen } from "./src/screens/home/HomeScreen";
import { CaptureScreen } from "./src/screens/capture/CaptureScreen";
import { DraftScreen } from "./src/screens/draft/DraftScreen";
import { EditExpenseScreen } from "./src/screens/edit/EditExpenseScreen";
import { SettingsScreen } from "./src/screens/settings/SettingsScreen";
import { SignInScreen } from "./src/screens/auth/SignInScreen";
import type { Draft } from "./src/drain";
import { CLERK_PUBLISHABLE_KEY } from "./src/config";
import { tokenCache } from "./src/auth/clerk";
import { setTokenGetter } from "./src/auth/session";
import { reconcileActiveUser } from "./src/auth/wipe";
import { requestSync } from "./src/sync/engine";

/** The app is a small stack: Home is the root; capture/draft/edit push over it. */
type Route =
  | { name: "home" }
  | { name: "capture" }
  | { name: "draft"; draft: Draft }
  | { name: "edit"; expense: Expense }
  | { name: "settings" };

/**
 * Root: load fonts, then wrap everything in ClerkProvider. AuthBridge exposes
 * the Clerk token to the plain-function API layer; the signed-in app shell and
 * the sign-in screen are gated by Clerk's <SignedIn>/<SignedOut>.
 */
export function App() {
  const [fontsLoaded, fontError] = useAppFonts();

  if (!fontsLoaded && !fontError) {
    return <View style={styles.splash} />;
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <AuthBridge />
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SignedIn>
          <AppShell />
        </SignedIn>
        <SignedOut>
          <SignInScreen />
        </SignedOut>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}

/** Feeds Clerk's hook-based token to the non-component API layer. */
function AuthBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenGetter(() => getToken());
    return () => setTokenGetter(null);
  }, [getToken]);
  return null;
}

/**
 * The signed-in app: the same hand-rolled four-route stack as before. On the
 * active user resolving, reconcile local data (wipe on account switch) and
 * kick a sync; a wipe bumps the reload token so the ledger refreshes.
 */
function AppShell() {
  const { userId } = useAuth();
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [reloadToken, setReloadToken] = useState(0);

  const goHome = useCallback(() => {
    setReloadToken((n) => n + 1);
    setRoute({ name: "home" });
  }, []);

  useEffect(() => {
    if (!userId) return;
    void reconcileActiveUser(userId).then((wiped) => {
      if (wiped) setReloadToken((n) => n + 1);
      requestSync(0);
    });
  }, [userId]);

  return (
    <>
      {route.name === "home" && (
        <HomeScreen
          reloadToken={reloadToken}
          onAddExpense={() => setRoute({ name: "capture" })}
          onEditExpense={(expense) => setRoute({ name: "edit", expense })}
          onOpenSettings={() => setRoute({ name: "settings" })}
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
      {route.name === "settings" && (
        <SettingsScreen onClose={() => setRoute({ name: "home" })} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.ground },
});
