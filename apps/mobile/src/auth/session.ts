/**
 * Bridge between Clerk's hook-based token (only available inside React) and the
 * plain-function API layer (`src/api/client.ts`, `src/sync/engine.ts`), which
 * runs outside the component tree. An <AuthBridge/> mounted under ClerkProvider
 * feeds `useAuth().getToken` in here; callers pull the current session JWT via
 * `getSessionToken()`. Returns null when signed out.
 */
type TokenGetter = () => Promise<string | null>;

let getter: TokenGetter | null = null;

/** Wire up (or, with null, tear down) the Clerk token source. */
export function setTokenGetter(fn: TokenGetter | null): void {
  getter = fn;
}

/** The current Clerk session JWT, or null if signed out / unavailable. */
export async function getSessionToken(): Promise<string | null> {
  if (!getter) return null;
  try {
    return await getter();
  } catch {
    return null;
  }
}

/** Whether a signed-in session can currently produce a token. */
export async function hasSession(): Promise<boolean> {
  return (await getSessionToken()) !== null;
}
