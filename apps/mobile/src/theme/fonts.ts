import {
  useFonts,
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from "@expo-google-fonts/roboto";
import {
  NotoSansBengali_400Regular,
  NotoSansBengali_500Medium,
  NotoSansBengali_700Bold,
} from "@expo-google-fonts/noto-sans-bengali";

/**
 * Load the bilingual type system: Roboto carries Latin text, Noto Sans Bengali
 * carries the taka sign (৳, U+09F3) and any Bangla, so a Dhaka user reads native
 * currency without a font fallback. RN has no CSS font stack — when a Roboto
 * glyph is missing (৳), the platform falls back to Noto if it is loaded, which
 * is why both families are registered here even though styles name only Roboto.
 *
 * Returns `[loaded, error]` from expo-font's useFonts; render a splash until
 * `loaded` is true.
 */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
    NotoSansBengali_400Regular,
    NotoSansBengali_500Medium,
    NotoSansBengali_700Bold,
  });
}
