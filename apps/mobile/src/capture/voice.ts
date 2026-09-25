import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

/** Default recognizer locale: Bangla (Bangladesh); handles mixed bn/en speech. */
export const DEFAULT_LOCALE = "bn-BD";

/**
 * Request microphone + on-device speech-recognition permission. Returns true
 * if granted. Audio is processed on-device and never leaves the phone.
 */
export async function requestVoicePermission(): Promise<boolean> {
  const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return result.granted;
}

/**
 * Begin an on-device recognition session. Results arrive via the event hooks
 * (`useVoiceResult` / `useVoiceEnd`); the caller stores the final transcript
 * with `captureVoiceTranscript`. Prefers on-device recognition so audio stays
 * local, and continuous mode so a multi-item utterance is captured whole.
 */
export function startVoiceCapture(locale: string = DEFAULT_LOCALE): void {
  ExpoSpeechRecognitionModule.start({
    lang: locale,
    interimResults: true,
    continuous: true,
    requiresOnDeviceRecognition: true,
  });
}

/** Stop the active recognition session (finalizes the transcript). */
export function stopVoiceCapture(): void {
  ExpoSpeechRecognitionModule.stop();
}

/** Subscribe to transcript updates (interim + final). */
export const useVoiceResult = (handler: (transcript: string, isFinal: boolean) => void) =>
  useSpeechRecognitionEvent("result", (e) => {
    const transcript = e.results?.[0]?.transcript ?? "";
    handler(transcript, Boolean(e.isFinal));
  });

/** Subscribe to session end. */
export const useVoiceEnd = (handler: () => void) =>
  useSpeechRecognitionEvent("end", handler);
