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
    requiresOnDeviceRecognition: true,
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
