---
name: Expense Tracker — Home
description: A calm, correct Bangladeshi expense tracker where the month's number leads and one blue pill captures the next.
colors:
  ground: "#FFFFFF"
  ink: "#111827"
  muted: "#6B7280"
  line: "#E5E7EB"
  action-blue: "#2563EB"
  positive-green: "#2F7A3E"
  surface-sunken: "#FAFAFA"
  fill-track: "#F3F4F6"
  chip-off-ink: "#374151"
  food-tint: "#FDE7C7"
  food-ink: "#B4741B"
  transport-tint: "#DCE9FB"
  transport-ink: "#2C5FA8"
  groceries-tint: "#E3F2E1"
  health-tint: "#F3E1F3"
  health-ink: "#8A3E8A"
typography:
  display:
    fontFamily: "Roboto, 'Noto Sans Bengali', system-ui, sans-serif"
    fontSize: "42px"
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Roboto, 'Noto Sans Bengali', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Roboto, 'Noto Sans Bengali', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  label:
    fontFamily: "Roboto, 'Noto Sans Bengali', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
  caption:
    fontFamily: "Roboto, 'Noto Sans Bengali', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
rounded:
  md: "12px"
  lg: "16px"
  full: "999px"
spacing:
  gap-tight: "8px"
  gap: "13px"
  pad-card: "16px"
  inset: "20px"
  section: "24px"
components:
  fab-add:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.ground}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 22px"
    height: "52px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "8px 14px"
  chip-unselected:
    backgroundColor: "{colors.fill-track}"
    textColor: "{colors.chip-off-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "8px 14px"
  list-card:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.md}"
  summary-card:
    backgroundColor: "{colors.surface-sunken}"
    rounded: "{rounded.lg}"
    padding: "16px"
  category-tile:
    rounded: "{rounded.full}"
    size: "38px"
  expense-row:
    padding: "13px 14px"
---

# Design System: Expense Tracker — Home

## Overview

**Creative North Star: "The Calm Ledger"**

This is the category-standard expense tracker executed impeccably: the number first, the detail beneath, nothing shouting. The whole surface is a quiet white page where one large taka figure carries the month, a donut and legend explain its shape, and a single blue pill offers the only loud gesture — add another expense. It refuses the busy dashboard and the novelty metaphor. There is no invented chrome, no decorative color, no ornament. Calm and correct is the entire point.

Density is deliberately low at the top (one dominant number, generous breathing room) and rises smoothly into a dense, scannable ledger of small UI text. The material is Material Design 3 for Android, played straight: soft white cards, hairline dividers, circular icon tiles, and pill-shaped controls. It is bilingual by construction — Roboto carries the Latin text, Noto Sans Bengali carries the taka sign (৳, U+09F3) and any Bangla — so a Dhaka user reads native currency without a font fallback.

The confirmed anti-reference is the crowded finance dashboard: no stacked KPI tiles, no gauge clutter, no second accent competing with the action blue.

**Key Characteristics:**
- White ground (#FFFFFF), near-black ink (#111827), a single action blue (#2563EB) reserved for the add gesture
- One dominant 42px number over a dense field of 12–15px UI text; no mid-range headline
- Flat, hairline-separated surfaces; the only pronounced shadow is the FAB's colored lift
- Four flat category pairs — a pale tint fill behind a saturated ink stroke/dot
- Circular icon tiles, pill chips and FAB, 12/16px card corners
- Bilingual Roboto + Noto Sans Bengali; taka (৳) is the currency

## Colors

A near-monochrome page — white, ink, and grey — carrying one action blue and four muted category accents; every color earns its place by role, none by decoration.

### Primary
- **Action Blue** (#2563EB): The single loud color. Used only on the floating "Add expense" pill and its colored shadow. It never appears as a link tint, a chart segment, a chip, or a decorative fill.

### Secondary
- **Positive Green** (#2F7A3E): The growth/positive signal. Used for the up-trend delta ("↑12% vs August") and, at the same value, as the Groceries category ink. One green, two consistent meanings.

### Tertiary — Category Pairs
Each expense category is a pale tint behind a saturated ink (used for the icon stroke, the legend dot, and the donut segment):
- **Food** — tint #FDE7C7 / ink #B4741B (amber)
- **Transport** — tint #DCE9FB / ink #2C5FA8 (blue)
- **Groceries** — tint #E3F2E1 / ink #2F7A3E (green, = Positive Green)
- **Health** — tint #F3E1F3 / ink #8A3E8A (purple)

### Neutral
- **Ground** (#FFFFFF): The page and the list-card background.
- **Ink** (#111827): Primary text — the month total, merchant names, amounts, the selected chip.
- **Muted** (#6B7280): Secondary text — month label, dates, the "6 expenses" count, delta suffix.
- **Line** (#E5E7EB): The 1px hairline for card borders and row dividers.
- **Surface Sunken** (#FAFAFA): The faintly recessed fill of the summary (donut) card.
- **Fill Track** (#F3F4F6): The donut's unfilled track and the unselected chip background.
- **Chip Off Ink** (#374151): Text on unselected chips — a softer ink than the primary.

### Named Rules
**The Action-Blue Rule.** Blue #2563EB is for the add action only. If a surface has more than one blue element, or blue on anything that isn't the primary capture gesture, it is wrong.

**The Category-Pair Rule.** A category is always a pale tint fill under a saturated ink mark — never a solid saturated fill behind white. The tint carries the icon tile; the ink carries the stroke, dot, and donut arc.

## Typography

**Display / Body Font:** Roboto (400 / 500 / 700)
**Bengali Font:** Noto Sans Bengali (400 / 500 / 700) — carries ৳ (U+09F3) and all Bangla
**Stack:** `Roboto, 'Noto Sans Bengali', system-ui, sans-serif`

**Character:** Neutral, legible, unopinionated — the Material default voice used with discipline. The system does not reach for personality in the type; it reaches for correctness and glanceability.

### Hierarchy
- **Display** (700, 42px, line-height 1.0, letter-spacing −0.02em): The month total only. The single large figure on the screen.
- **Title** (700, 15px): Section headers — "Recent".
- **Body** (500, 14px): Merchant names and expense amounts. Amounts use `font-variant-numeric: tabular-nums`.
- **Label** (500, 12–13px): Interactive and meta text — month label (13px), chips (12px), the delta (12.5px), legend rows (12.5px), and the FAB (14.5px). Frontmatter carries 13px as the representative value.
- **Caption** (400, 12px, muted): Dates, the sub-line method/category, the "6 expenses" count.

### Named Rules
**The One-Big-Number Rule.** Exactly one element is large: the month total at 42px. Everything else lives in the 12–15px band. Never introduce a mid-size headline between the total and the labels — the gap is what makes the number read as the answer.

**The Tabular-Amount Rule.** Every currency figure uses tabular-nums so the taka column aligns down the ledger regardless of digit width.

## Layout

Single-column, native-first. The canonical canvas is 412×915 (Android, portrait); the responsive variant reflows the same column fluidly to wider viewports without adding chrome.

The content column is inset **20px** on the left and right and **17px** from the top. The vertical rhythm is a loose, optically-tuned scale rather than a strict 8pt grid: tight pairs (2px, 7px) bind a label to its value, ~13–16px pads card interiors, 20px separates the donut from its legend, and ~22–24px opens between major blocks (total → summary card → chips → list). The FAB floats 20px from the right edge and 28px from the bottom.

**Named Rule — The Status-Bar Inset Rule.** The content top inset is **17px**, deliberately less than a bare-mock value. In the shipped React Native app the content sits inside a SafeAreaView below the Android status bar (~24dp); the system inset supplies the remainder so the total lands at the comp's optical position. Treat 17px as correct for the in-app render — it is a layout rule, not a defect, and it presumes the status-bar inset is present above it.

## Elevation & Depth

The system is flat by default. Depth comes from 1px hairline borders and one faintly-recessed fill, not from a shadow stack. Two shadows exist, and they are the exceptions: a barely-there lift under the list card, and a pronounced colored lift under the FAB that reads as the one interactive object hovering above the page.

### Shadow Vocabulary
- **Card hairline lift** (`box-shadow: 0 1px 2px rgba(17,24,39,.05)`): The list card. Nearly imperceptible — separates the card from white without announcing elevation.
- **FAB lift** (`box-shadow: 0 4px 12px rgba(37,99,235,.32)`): The add pill. A blue-tinted shadow that ties the lift to the action color and marks the FAB as the single floating element.

### Named Rules
**The Hairline-First Rule.** Surfaces separate by a 1px #E5E7EB hairline (and, for the summary card, a #FAFAFA sunken fill) before they ever reach for a shadow. The only real shadow on the page belongs to the FAB.

## Shapes

A page of soft rectangles and true circles. Cards use gently rounded corners — **12px** for the list card, a slightly softer **16px** for the summary card. Interactive pills — the category chips and the FAB — are fully rounded (**999px**). Category icon tiles are **true circles** (38px diameter, border-radius 50%). Legend markers are tiny 9px rounded squares (3px radius). Icons themselves are stroke-line SVGs at 19px with 1.8 stroke-width, round caps and joins — never filled glyphs or emoji.

## Components

### Buttons
- **FAB "Add expense"** — character: the one confident gesture on a calm page. **Shape:** full pill (999px). **Size:** 52px tall, padding `0 22px`, floating 20px from the right and 28px from the bottom. **Color:** Action Blue #2563EB fill, white text (14.5px/500) and a white 18px plus-icon (2.2 stroke). **Elevation:** the FAB lift shadow (see Elevation). **State:** M3 state-layer ripple on press, shadow lifts 4dp→8dp over 100ms.

### Chips (category filter)
- **Style:** full pills (999px), padding `8px 14px`, 12px/500 text, laid in a horizontal row with 8px gaps.
- **Selected:** ink #111827 fill, white text.
- **Unselected:** #F3F4F6 fill, #374151 text.
- **State:** selection cross-fades the pill background (ink ↔ grey) over 150ms with no layout shift.

### Cards / Containers
- **List card** — **Corner:** 12px. **Background:** white. **Border:** 1px #E5E7EB. **Shadow:** card hairline lift. Holds the expense rows; rows are divided by a 1px #E5E7EB top border (not their own boxes). Top margin 10px from the header.
- **Summary card** — **Corner:** 16px. **Background:** sunken #FAFAFA. **Border:** 1px #E5E7EB. **Shadow:** none. **Padding:** 16px. Holds the donut (left) and legend (right) with a 20px gap.

### Expense Row (signature)
A three-part row, padding `13px 14px`, 13px internal gaps: a **circular category tile** (38px, category tint fill, category-ink 19px stroke-line SVG icon) · a **middle block** (merchant name, body 14px/500, truncating with ellipsis; date+category sub-line, caption 12px muted) · a **right-aligned amount** (body 14px/500, tabular-nums).

### Category Donut (signature)
An SVG ring on a #F3F4F6 track, stroke-width 6, with one arc per category drawn in that category's ink. Paired with a legend of 9px color dots, category names, and right-aligned tabular amounts. **Motion:** segments sweep clockwise from 0 over 600ms, staggered 60ms per segment.

### Month Total (signature)
The lead figure: `৳ 24,850` at 42px/700, letter-spacing −0.02em, ink. Above it a 13px muted month label; below it a 12.5px green delta with an up-arrow. **Motion:** the total counts up 0→value on mount over 450ms (M3 standard-decelerate, once).

## Do's and Don'ts

### Do:
- **Do** reserve Action Blue (#2563EB) for the single add gesture and its shadow — nothing else on the screen is blue.
- **Do** build every category as a pale tint fill under a saturated ink mark, using the four documented pairs.
- **Do** render currency and Bangla through Noto Sans Bengali in the stack, and set all amounts in tabular-nums.
- **Do** keep exactly one large number (42px total) and hold everything else in the 12–15px band.
- **Do** separate surfaces with 1px #E5E7EB hairlines first; reach for shadow only for the FAB.
- **Do** honor reduce-motion: disable the count-up and donut sweep and render the final state.

### Don't:
- **Don't** introduce a second accent color or tint anything decoratively — the palette is near-monochrome plus blue plus four category inks.
- **Don't** add heavy or stacked elevation; the page is flat with hairlines and two restrained shadows.
- **Don't** insert a mid-size headline between the 42px total and the 15px section label.
- **Don't** use filled glyph icons or emoji — icons are 19px stroke-line SVGs at 1.8 stroke-width.
- **Don't** give expense rows their own boxes; they share one card, divided by hairlines.
