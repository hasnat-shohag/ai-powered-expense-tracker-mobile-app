import { useEffect, useMemo, useRef } from "react";
import { Animated } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const R = 15.9155; // circumference = 2πR = 100, so dash units read as percentages
const CENTER = 21;
const STROKE = 6;

export interface DonutSegment {
  color: string;
  /** Share of the ring, 0–100. */
  pct: number;
}

/**
 * Category Donut (signature): an SVG ring on a #F3F4F6 track, one arc per
 * category in its ink, stroke-width 6. Segments sweep clockwise from 0 over
 * 600ms, staggered 60ms per segment; reduce-motion renders the final ring.
 */
export function CategoryDonut({
  segments,
  size = 92,
  reduceMotion,
}: {
  segments: DonutSegment[];
  size?: number;
  reduceMotion: boolean;
}) {
  // Cumulative start angle per segment (clockwise from 12 o'clock).
  const arcs = useMemo(() => {
    let cum = 0;
    return segments.map((s) => {
      const start = -90 + cum * 3.6;
      cum += s.pct;
      return { ...s, start };
    });
  }, [segments]);

  // One draw-in progress value per arc, hidden (=pct) → shown (=0 offset).
  const offsets = useRef<Animated.Value[]>([]).current;
  while (offsets.length < arcs.length) offsets.push(new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      arcs.forEach((_, i) => offsets[i]?.setValue(0));
      return;
    }
    arcs.forEach((a, i) => offsets[i]?.setValue(a.pct));
    const anims = arcs.map((_, i) =>
      Animated.timing(offsets[i]!, {
        toValue: 0,
        duration: 600,
        delay: i * 60,
        useNativeDriver: true,
      }),
    );
    const group = Animated.parallel(anims);
    group.start();
    return () => group.stop();
  }, [arcs, reduceMotion, offsets]);

  return (
    <Svg width={size} height={size} viewBox="0 0 42 42">
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={R}
        fill="none"
        stroke={colors.fillTrack}
        strokeWidth={STROKE}
      />
      {arcs.map((a, i) => (
        <AnimatedCircle
          key={i}
          cx={CENTER}
          cy={CENTER}
          r={R}
          fill="none"
          stroke={a.color}
          strokeWidth={STROKE}
          strokeLinecap="butt"
          strokeDasharray={[a.pct, 100 - a.pct]}
          strokeDashoffset={offsets[i]}
          rotation={a.start}
          originX={CENTER}
          originY={CENTER}
        />
      ))}
    </Svg>
  );
}
