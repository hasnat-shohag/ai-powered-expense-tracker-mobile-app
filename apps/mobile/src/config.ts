import Constants from "expo-constants";

/**
 * The backend base URL. Set per deployment in app.json → expo.extra.apiBaseUrl
 * (the user's own Vercel deployment). No secrets live here — only the public
 * HTTPS origin. The bearer token is entered in-app and kept in SecureStore.
 */
export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? "";

/** True once a real backend origin has been configured. */
export function isApiConfigured(): boolean {
  return API_BASE_URL.length > 0 && !API_BASE_URL.includes("REPLACE-WITH-YOUR");
}
