import { useCallback, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { colors, radius, space, type } from "../../theme";
import { PrimaryButton } from "../../ui/controls";
import { CLERK_PUBLISHABLE_KEY } from "../../config";

// Completes the OAuth redirect back into the app (required on Android/web).
WebBrowser.maybeCompleteAuthSession();

// Poll a getter until it returns a truthy value or the budget elapses. Used to
// wait for the OAuth redirect to land via Linking after the custom tab closes.
function pollFor(get: () => string | null, ms: number): Promise<string | null> {
  return new Promise((resolve) => {
    const step = 100;
    let waited = 0;
    const id = setInterval(() => {
      const v = get();
      if (v || waited >= ms) {
        clearInterval(id);
        resolve(v ?? null);
      }
      waited += step;
    }, step);
  });
}

/**
 * Sign-in gate, styled to "The Calm Ledger": white ground, one big word, a
 * single Action-Blue affordance. Google is the only method for now; Clerk
 * handles the round-trip and session. On success Clerk flips <SignedOut> to
 * <SignedIn> and the app shell mounts.
 *
 * The OAuth flow is hand-rolled (instead of clerk-expo's `useOAuth`) because on
 * some Android OEMs — confirmed on Honor/Huawei here — the Chrome custom tab is
 * torn down as `dismiss` and the OAuth redirect is delivered to MainActivity as
 * a new intent (Linking) rather than resolving `openAuthSessionAsync`. Clerk's
 * `useOAuth` trusts only `authSessionResult.type === "success"`, so it silently
 * drops a completed login. We capture the redirect URL from Linking as a
 * fallback and finish the flow ourselves.
 */
export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = CLERK_PUBLISHABLE_KEY.length > 0;

  const onPress = useCallback(async () => {
    if (!isLoaded || !signIn || !signUp || !setActive) return;
    setBusy(true);
    setError(null);

    const redirectUrl = makeRedirectUri({
      scheme: "expensetracker",
      path: "oauth-native-callback",
    });

    // Listen for the redirect deep-link independently of WebBrowser, so an
    // OEM that closes the tab as `dismiss` (delivering the URL via a new
    // intent) doesn't lose the completed login.
    let capturedUrl: string | null = null;
    const sub = Linking.addEventListener("url", (e) => {
      capturedUrl = e.url;
    });

    try {
      await signIn.create({ strategy: "oauth_google", redirectUrl });
      const externalUrl =
        signIn.firstFactorVerification.externalVerificationRedirectURL;
      if (!externalUrl) throw new Error("no external verification URL");

      const res = await WebBrowser.openAuthSessionAsync(
        externalUrl.toString(),
        redirectUrl,
      );

      // Prefer WebBrowser's own captured URL; fall back to the Linking intent
      // (may arrive a beat after the tab closes on affected OEMs).
      let callbackUrl: string | null = res.type === "success" ? res.url : null;
      if (!callbackUrl) {
        callbackUrl = capturedUrl ?? (await pollFor(() => capturedUrl, 3000));
      }
      if (!callbackUrl) {
        setError(`Sign-in did not complete — browser=${res.type}`);
        return;
      }

      const nonce =
        new URL(callbackUrl).searchParams.get("rotating_token_nonce") ?? "";
      await signIn.reload({ rotatingTokenNonce: nonce });

      // Existing account completes on the signIn leg; a brand-new account is
      // "transferable" and finishes by creating the signUp via transfer.
      let sessionId: string | null = null;
      if (signIn.status === "complete") {
        sessionId = signIn.createdSessionId;
      } else if (
        signIn.firstFactorVerification.status === "transferable"
      ) {
        await signUp.create({ transfer: true });
        sessionId = signUp.createdSessionId ?? null;
      }

      if (sessionId) {
        await setActive({ session: sessionId });
      } else {
        setError(
          `Sign-in did not complete — signIn=${signIn.status ?? "-"} signUp=${signUp.status ?? "-"}`,
        );
      }
    } catch (e) {
      const msg =
        (e as { errors?: { message?: string }[] })?.errors?.[0]?.message ||
        (e as Error)?.message ||
        "unknown error";
      setError(`Could not sign in — ${msg}`);
    } finally {
      sub.remove();
      setBusy(false);
    }
  }, [isLoaded, signIn, signUp, setActive]);

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
            onPress={onPress}
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
