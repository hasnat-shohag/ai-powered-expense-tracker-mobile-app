import { StyleSheet, Text, View } from "react-native";
import { colors, tabular, type } from "../../theme";
import { formatTaka } from "../../format";
import { ArrowUpIcon } from "../../ui/icons";

/**
 * The lead figure (Month Total signature). A muted month label, the one large
 * 42px taka number, and a green up-trend delta beneath.
 *
 * The total renders directly and is never animated. A count-up used to run
 * 0→value over 450ms on mount, and it reported a false ৳ 0 for the whole of
 * the mount stall: its initial state was 0, and the JS thread is busy reading
 * SQLite and rendering the ledger at exactly that moment, so the frames that
 * would have advanced it were late. The donut beside it kept sweeping the
 * whole time — it animates on the UI thread — which made the screen look alive
 * around a number that was simply wrong.
 *
 * A cold start is also the only time that animation ever ran: this screen has
 * no month switcher, so the one occasion for the count-up was the one where it
 * lied. A ledger's answer is not a flourish; the figure is correct from the
 * first frame.
 */
export function MonthTotal({
  label,
  total,
  deltaPct,
  deltaLabel,
}: {
  label: string;
  total: number;
  deltaPct: number | null;
  deltaLabel: string;
}) {
  return (
    <View>
      <Text style={styles.month}>{label}</Text>
      <Text style={styles.total} numberOfLines={1}>
        {formatTaka(total)}
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
