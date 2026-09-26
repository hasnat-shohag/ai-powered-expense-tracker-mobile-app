import Constants from "expo-constants";

/**
 * The backend base URL. In dev, EXPO_PUBLIC_API_BASE_URL (e.g. a LAN
 * http://192.168.x.x:3000 pointing at `vercel dev`) takes precedence so the
 * committed prod origin stays untouched. Otherwise set per deployment in
 * app.json → expo.extra.apiBaseUrl (the user's own Vercel deployment). No
 * secrets live here — only the public origin. The bearer token is entered
 * in-app and kept in SecureStore.
 */
export const API_BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  "";

/** True once a real backend origin has been configured. */
export function isApiConfigured(): boolean {
  return API_BASE_URL.length > 0 && !API_BASE_URL.includes("REPLACE-WITH-YOUR");
}
