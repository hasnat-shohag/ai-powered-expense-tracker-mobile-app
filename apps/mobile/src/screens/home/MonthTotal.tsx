import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors, space, tabular, type } from "../../theme";
import { formatTaka } from "../../format";
import { ArrowUpIcon } from "../../ui/icons";

/**
 * The lead figure (Month Total signature). A muted month label, the one large
 * 42px taka number, and a green up-trend delta beneath. The total counts up
 * 0→value on mount over 450ms (M3 standard-decelerate, once); reduce-motion
 * renders the final value directly.
 */
export function MonthTotal({
  label,
  total,
  deltaPct,
  deltaLabel,
  reduceMotion,
}: {
  label: string;
  total: number;
  deltaPct: number | null;
  deltaLabel: string;
  reduceMotion: boolean;
}) {
  const [shown, setShown] = useState(reduceMotion ? total : 0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      setShown(total);
      return;
    }
    progress.setValue(0);
    const id = progress.addListener(({ value }) => setShown(value * total));
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => {
      anim.stop();
      progress.removeListener(id);
    };
  }, [total, reduceMotion, progress]);

  return (
    <View>
      <Text style={styles.month}>{label}</Text>
      <Text style={styles.total} numberOfLines={1}>
        {formatTaka(shown)}
      </Text>
      {deltaPct != null && (
        <View style={styles.delta}>
          <ArrowUpIcon color={colors.positiveGreen} />
          <Text style={styles.deltaText}>
            {deltaPct}% <Text style={styles.deltaSuffix}>{deltaLabel}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  month: { ...type.label, color: colors.muted },
  total: {
    ...type.display,
    ...tabular,
    color: colors.ink,
    marginTop: 2,
  },
  delta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 },
  deltaText: {
    fontFamily: type.body.fontFamily,
    fontSize: 12.5,
    color: colors.positiveGreen,
  },
  deltaSuffix: { fontFamily: type.caption.fontFamily, color: colors.muted },
});
