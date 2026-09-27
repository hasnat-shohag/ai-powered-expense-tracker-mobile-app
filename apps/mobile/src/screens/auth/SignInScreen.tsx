import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { useOAuth } from "@clerk/clerk-expo";
import { colors, radius, space, type } from "../../theme";
import { PrimaryButton } from "../../ui/controls";
import { CLERK_PUBLISHABLE_KEY } from "../../config";

// Completes the OAuth redirect back into the app (required on Android/web).
WebBrowser.maybeCompleteAuthSession();

/**
 * Sign-in gate, styled to "The Calm Ledger": white ground, one big word, a
 * single Action-Blue affordance. Google is the only method for now; the
 * managed provider (Clerk) handles the round-trip and session. On success
 * Clerk flips <SignedOut> to <SignedIn> and the app shell mounts.
 */
export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = CLERK_PUBLISHABLE_KEY.length > 0;

  const signIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: makeRedirectUri({ scheme: "expensetracker" }),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      } else {
        // Flow cancelled or needs extra steps (e.g. sign-up not allowlisted).
        setError("Sign-in did not complete. Try again.");
      }
    } catch {
      setError("Could not sign in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [startOAuthFlow]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.hero}>
        <Text style={styles.brand}>Expense{"\n"}Tracker</Text>
        <Text style={styles.tagline}>Capture spend by text, photo, or voice.</Text>
      </View>
      <View style={styles.actions}>
        {configured ? (
          <PrimaryButton
            label="Continue with Google"
            onPress={signIn}
            loading={busy}
          />
        ) : (
          <Text style={styles.err}>
            Sign-in is not configured. Set expo.extra.clerkPublishableKey in
            app.json.
          </Text>
        )}
        {error && <Text style={styles.err}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
    paddingHorizontal: space.inset,
    justifyContent: "space-between",
  },
  hero: { flex: 1, justifyContent: "center", gap: 12 },
  brand: { ...type.display, color: colors.ink, lineHeight: 46 },
  tagline: { fontFamily: type.body.fontFamily, fontSize: 15, color: colors.muted },
  actions: { paddingBottom: 24, gap: 12 },
  err: {
    fontFamily: type.caption.fontFamily,
    fontSize: 13,
    color: "#B42318",
    textAlign: "center",
    padding: 4,
  },
});
