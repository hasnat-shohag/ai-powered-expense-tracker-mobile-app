import * as SecureStore from "expo-secure-store";

/**
 * Clerk's session token cache backed by the OS keystore (SecureStore), so the
 * signed-in session survives app restarts and cold, offline launches. Clerk
 * reads/writes short-lived JWTs here; a network refresh only happens when a
 * request actually fires — i.e. when the device is already online — so the
 * offline-first capture flow is unaffected.
 */
export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Non-fatal: a failed cache write just forces a re-fetch when online.
    }
  },
};
