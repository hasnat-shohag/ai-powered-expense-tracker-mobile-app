import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "api_bearer_token";

/**
 * The static bearer token that authenticates every backend request. Entered
 * once in-app and held in the OS keystore via SecureStore — never in env,
 * never in the JS bundle. Rotatable: set a new value to replace it.
 */
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token.trim());
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function hasToken(): Promise<boolean> {
  return (await getToken()) !== null;
}
