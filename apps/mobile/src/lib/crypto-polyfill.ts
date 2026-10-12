import * as Crypto from "expo-crypto";

/**
 * uuid v7 (used for client-generated PKs) calls `crypto.getRandomValues`, which
 * Hermes / Expo Go / RN do not provide out of the box — the missing global
 * throws "crypto.getRandomValues() not supported" the moment we mint an id.
 * Back it with expo-crypto's synchronous CSPRNG (bundled in Expo Go and every
 * build). Imported before any code that generates an id, so the global exists
 * first. No-ops if a real implementation is already present.
 */
const g = globalThis as { crypto?: { getRandomValues?: unknown } };

if (!g.crypto) {
  g.crypto = {};
}

if (typeof g.crypto.getRandomValues !== "function") {
  g.crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
    if (array == null) return array;
    const bytes = Crypto.getRandomBytes(array.byteLength);
    new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(bytes);
    return array;
  };
}
