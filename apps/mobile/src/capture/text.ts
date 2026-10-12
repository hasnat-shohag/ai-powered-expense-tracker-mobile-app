import { addPendingCapture } from "../db";

/**
 * Record a typed expense as a pending capture. The raw text is preserved
 * verbatim (kept for later re-parse); parsing happens later at drain time.
 * Returns the new capture id. Throws on empty input.
 */
export async function captureText(raw: string): Promise<string> {
  const text = raw.trim();
  if (!text) throw new Error("Nothing to capture — the text is empty.");
  return addPendingCapture({ source: "text", rawText: text });
}

/**
 * Record a voice capture. On-device STT (see ./voice) has already transcribed
 * speech to text; only the transcript is stored — audio never leaves the phone.
 */
export async function captureVoiceTranscript(transcript: string): Promise<string> {
  const text = transcript.trim();
  if (!text) throw new Error("Nothing to capture — the transcript is empty.");
  return addPendingCapture({ source: "voice", rawText: text });
}
