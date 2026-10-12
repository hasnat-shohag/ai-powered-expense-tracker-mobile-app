import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { addPendingCapture, newId } from "../db";

/** Longest edge of a stored receipt JPEG; keeps files small for base64 upload. */
const MAX_EDGE = 1500;
const JPEG_QUALITY = 0.7;
const CAPTURE_DIR = `${FileSystem.documentDirectory}captures/`;

async function ensureCaptureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CAPTURE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CAPTURE_DIR, { intermediates: true });
  }
}

/**
 * Compress a source image to a downscaled JPEG in the app's persistent
 * captures directory and enqueue it as a pending capture. Returns the capture
 * id. The compressed file survives app restarts until the drain step deletes
 * it after a successful save.
 */
export async function captureImageFromUri(uri: string): Promise<string> {
  await ensureCaptureDir();
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_EDGE } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  const dest = `${CAPTURE_DIR}${newId()}.jpg`;
  await FileSystem.moveAsync({ from: manipulated.uri, to: dest });
  return addPendingCapture({ source: "image", imagePath: dest });
}

/**
 * Take a receipt photo with the camera, then compress + queue it. Resolves to
 * the capture id, or null if the user cancels or denies camera permission.
 */
export async function captureReceiptPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return captureImageFromUri(result.assets[0]!.uri);
}

/**
 * Pick an existing receipt image from the library, then compress + queue it.
 * Resolves to the capture id, or null if cancelled / permission denied.
 */
export async function captureReceiptFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return captureImageFromUri(result.assets[0]!.uri);
}

/** Delete a captured image file (called after its parse result is saved). */
export async function deleteCaptureFile(path: string | null): Promise<void> {
  if (!path) return;
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    // A missing file is fine — the goal state (gone) already holds.
  }
}
