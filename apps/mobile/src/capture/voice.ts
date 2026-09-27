import type {
  ExpoSpeechRecognitionModule as SpeechModule,
  useSpeechRecognitionEvent as useSpeechEvent,
} from "expo-speech-recognition";

/**
 * expo-speech-recognition is a custom native module: it is present in a
 * development/production build but NOT in Expo Go, where requiring it throws
 * "Cannot find native module 'ExpoSpeechRecognition'" at import time and takes
 * the whole app down with it. Load it defensively so the rest of the app
 * (text/receipt capture, parse, sync) still runs in Expo Go; voice simply
 * reports itself unavailable there.
 */
type SpeechApi = {
  ExpoSpeechRecognitionModule: typeof SpeechModule;
  useSpeechRecognitionEvent: typeof useSpeechEvent;
};

let speech: SpeechApi | null = null;
try {
  // Metro/CommonJS require: throws in Expo Go where the native module is absent.
  speech = require("expo-speech-recognition") as SpeechApi;
} catch {
  speech = null;
}

/** True only in a build that bundles the native speech module (not Expo Go). */
export const isVoiceAvailable: boolean = speech !== null;

/** Default recognizer locale: Bangla (Bangladesh); handles mixed bn/en speech. */
export const DEFAULT_LOCALE = "bn-BD";

/**
 * Request microphone + on-device speech-recognition permission. Returns true
 * if granted. Audio is processed on-device and never leaves the phone. Returns
 * false when voice is unavailable (e.g. running under Expo Go).
 */
export async function requestVoicePermission(): Promise<boolean> {
  if (!speech) return false;
  const result = await speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return result.granted;
}

/**
 * Begin an on-device recognition session. Results arrive via the event hooks
 * (`useVoiceResult` / `useVoiceEnd`); the caller stores the final transcript
 * with `captureVoiceTranscript`. Prefers on-device recognition so audio stays
 * local, and continuous mode so a multi-item utterance is captured whole.
 * No-op when voice is unavailable.
 */
export function startVoiceCapture(locale: string = DEFAULT_LOCALE): void {
  if (!speech) return;
  speech.ExpoSpeechRecognitionModule.start({
    lang: locale,
    interimResults: true,
    continuous: true,
    // Do NOT force on-device recognition: the offline bn-BD model is absent on
    // most Android devices, so requiring it made the recognizer error out
    // immediately with an empty transcript. false lets the platform use its
    // network recognizer and fall back to on-device only when available.
    requiresOnDeviceRecognition: false,
  });
}

/** Stop the active recognition session (finalizes the transcript). No-op when unavailable. */
export function stopVoiceCapture(): void {
  if (!speech) return;
  speech.ExpoSpeechRecognitionModule.stop();
}

/** Subscribe to transcript updates (interim + final). No-op hook when voice unavailable. */
export const useVoiceResult = speech
  ? (handler: (transcript: string, isFinal: boolean) => void) =>
      speech!.useSpeechRecognitionEvent("result", (e) => {
        const transcript = e.results?.[0]?.transcript ?? "";
        handler(transcript, Boolean(e.isFinal));
      })
  : (_handler: (transcript: string, isFinal: boolean) => void) => {};

/** Subscribe to session end. No-op hook when voice unavailable. */
export const useVoiceEnd = speech
  ? (handler: () => void) => speech!.useSpeechRecognitionEvent("end", handler)
  : (_handler: () => void) => {};

/**
 * Subscribe to recognition errors. Without this every failure (no network
 * recognizer, unsupported locale, no speech, permission) was silent: the
 * button showed "Listening…" then reverted with nothing captured. Surfaces
 * the platform error code + message so the caller can show it. No-op hook when
 * voice unavailable.
 */
export const useVoiceError = speech
  ? (handler: (code: string, message: string) => void) =>
      speech!.useSpeechRecognitionEvent("error", (e) =>
        handler(e.error, e.message ?? e.error),
      )
  : (_handler: (code: string, message: string) => void) => {};
