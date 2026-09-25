import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { CategoryName } from "../theme";

/**
 * Stroke-line SVG icons at 19px / 1.8 stroke, round caps and joins — never
 * filled glyphs or emoji (per DESIGN.md Shapes). Category tiles pass the
 * category ink as `color`; the FAB and delta pass their own.
 */
interface IconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

const base = {
  fill: "none" as const,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function FoodIcon({ size = 19, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 3v9a3 3 0 0 0 3 3h6" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Circle cx="17" cy="18" r="3" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M9 3v4" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

function TransportIcon({ size = 19, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="6" cy="17" r="3.4" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Circle cx="18" cy="17" r="3.4" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M6 17l4-8h5l3 8M10 9h5" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

function GroceriesIcon({ size = 19, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 8h16l-1.4 11H5.4z" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M9 8a3 3 0 0 1 6 0" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

function HealthIcon({ size = 19, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="9" y="4" width="6" height="16" rx="3" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Rect x="4" y="9" width="16" height="6" rx="3" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

function WalletIcon({ size = 19, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4" y="6" width="16" height="13" rx="2.5" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M16 12h3" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

const byCategory: Record<CategoryName, (p: IconProps) => JSX.Element> = {
  Food: FoodIcon,
  Transport: TransportIcon,
  Groceries: GroceriesIcon,
  Health: HealthIcon,
};

/** Category icon with a Wallet fallback for uncategorized/unknown labels. */
export function CategoryIcon({
  category,
  ...props
}: IconProps & { category: string | null | undefined }) {
  const Icon =
    category && category in byCategory
      ? byCategory[category as CategoryName]
      : WalletIcon;
  return <Icon {...props} />;
}

/** The FAB / add glyph — 2.2 stroke to read confidently at 18px on blue. */
export function PlusIcon({ size = 18, color, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

/** The up-trend delta arrow. */
export function ArrowUpIcon({ size = 12, color, strokeWidth = 2.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 19V5M5 12l7-7 7 7" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

/** Back chevron for screen top bars. */
export function ChevronLeftIcon({ size = 22, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

/** Camera glyph for the receipt-photo capture affordance. */
export function CameraIcon({ size = 20, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Circle cx="12" cy="13" r="3.2" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

/** Image / library glyph. */
export function ImageIcon({ size = 20, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4" y="5" width="16" height="14" rx="2.5" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Circle cx="9" cy="10" r="1.6" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M5 17l4.5-4 3 2.5L16 12l3 3.5" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

/** Microphone glyph for voice capture. */
export function MicIcon({ size = 20, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="9" y="3" width="6" height="11" rx="3" stroke={color} strokeWidth={strokeWidth} {...base} />
      <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

/** Small trash glyph for the delete affordance. */
export function TrashIcon({ size = 18, color, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" stroke={color} strokeWidth={strokeWidth} {...base} />
    </Svg>
  );
}

