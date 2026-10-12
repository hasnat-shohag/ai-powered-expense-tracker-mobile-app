import { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { colors, radius, space, type } from "../../theme";

/**
 * Category filter chips (full pills). Selected = ink fill / white text;
 * unselected = #F3F4F6 fill / #374151 text. Selection cross-fades the pill
 * background over 150ms with no layout shift; reduce-motion snaps instead.
 */
export function CategoryChips({
  chips,
  selected,
  onSelect,
  reduceMotion,
}: {
  chips: string[];
  selected: string;
  onSelect: (chip: string) => void;
  reduceMotion: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {chips.map((chip) => (
        <Chip
          key={chip}
          label={chip}
          on={chip === selected}
          onPress={() => onSelect(chip)}
          reduceMotion={reduceMotion}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  on,
  onPress,
  reduceMotion,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  reduceMotion: boolean;
}) {
  const t = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      t.setValue(on ? 1 : 0);
      return;
    }
    const anim = Animated.timing(t, {
      toValue: on ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [on, reduceMotion, t]);

  const backgroundColor = t.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.fillTrack, colors.ink],
  });
  const color = t.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.chipOffInk, colors.ground],
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.chip, { backgroundColor }]}>
        <Animated.Text style={[styles.label, { color }]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { marginTop: space.inset, flexGrow: 0 },
  row: { flexDirection: "row", gap: space.gapTight },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.full },
  label: { fontFamily: type.label.fontFamily, fontSize: 12 },
});
