# Splitfree Design Guidelines

## Purpose

This document is the single source of truth for Splitfree UI work.

- Source mock: `docs/design/theme-bold-graphic.html`
- Scope: shadcn theme configuration, component styling, page layouts, and responsive behavior
- Product direction: bold, high-contrast, graphic-led expense sharing UI for India-first INR expense splitting

## 1. Color Palette

### Brand and Core UI Colors

| Token | Hex | Usage |
|---|---|---|
| `bold` | `#000000` | Primary dark text, dark panels, high-emphasis surfaces |
| `hotgreen` | `#00D26A` | Primary brand/action color, active states, CTAs |
| `accent` | `#FACC15` | Yellow highlight marks, secondary callouts |
| `bg` | `#F5F5F0` | Default page background |
| `bgwarm` | `#FFFDF7` | Warm alternate section background |
| `surface` | `#FFFFFF` | Card surface, input backgrounds |
| `textsec` | `#404040` | Secondary text, supporting copy |
| `lime` | `#84CC16` | Hover state for hotgreen, secondary green accent |

### Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| `success` | `#22C55E` | Positive balances, confirmed actions |
| `error` | `#FF3B30` | Negative balances, destructive states |

### Background and Surface Colors

| Context | Value |
|---|---|
| App/page background | Flat `#F5F5F0` |
| Primary card surface | `#FFFFFF` |
| Warm section surface | `#FFFDF7` |
| High-emphasis panel | `#000000` |
| Primary action surface | `#00D26A` |
| Accent highlight | `#FACC15` |

### Border and Divider Colors

| Context | Value |
|---|---|
| Default border | `rgba(0, 0, 0, 0.12)` |
| Thick structural border | `2px solid #000000` |
| Feature card border | `4px solid #00D26A` |
| Divider on dark surfaces | `2px solid #00D26A` |

### Text Colors

| Token | Value | Usage |
|---|---|---|
| Text primary | `#000000` | Headings, body text, labels |
| Text secondary | `#404040` | Supporting copy, descriptions |
| Text on dark | `#FFFFFF` | Text on black/dark panels |
| Text on dark muted | `rgba(255, 255, 255, 0.55)` | Labels on dark surfaces |
| Text accent on dark | `#00D26A` | Eyebrows and labels on dark surfaces |

## 2. Typography

### Font Family

- Single font: `"Space Grotesk", ui-sans-serif, system-ui, sans-serif`
- Used everywhere: headings, body, buttons, labels, financial values
- Monospace fallback: `ui-monospace, SFMono-Regular, Menlo, monospace`

### Type Scale

| Style | Size | Line height | Letter spacing | Weight | Usage |
|---|---|---|---|---|---|
| `h1` | `clamp(48px, 10vw, 96px)` | `1.0` | `-0.02em` | `700` | Landing hero |
| `h2` | `clamp(32px, 5vw, 48px)` | `1.1` | `-0.02em` | `700` | Section titles |
| `h3` | `2rem` / `32px` | `1.15` | `-0.02em` | `700` | Major card titles |
| `h4` | `1.5rem` / `24px` | `1.2` | `-0.015em` | `700` | Subsection headers |
| `title-lg` | `1.25rem` / `20px` | `1.3` | `-0.01em` | `700` | Module titles |
| `body` | `1rem` / `16px` | `1.6` | `0` | `400` | Default body copy |
| `body-sm` | `0.875rem` / `14px` | `1.55` | `0` | `400`/`500` | Secondary text |
| `label` | `0.75rem` / `12px` | `1.4` | `0.3em` uppercase | `700` | Eyebrows, tracking-ultra labels |
| `label-sm` | `0.625rem` / `10px` | `1.35` | `0.3em` uppercase | `700` | Micro labels |
| `caption` | `0.6875rem` / `11px` | `1.35` | `0.15em` uppercase | `700` | Nav labels, tracking-wide-custom |

### Letter Spacing Tokens

| Token | Value | Usage |
|---|---|---|
| `tracking-ultra` | `0.3em` | Eyebrow labels, section labels, nav items |
| `tracking-wide-custom` | `0.15em` | Subsection labels, captions |

### Font Weights

- Regular: `400` (body copy)
- Medium: `500` (secondary text, some labels)
- Bold: `700` (headings, buttons, financial values, labels)

### Typography Rules

- Use `Space Grotesk` for everything. No secondary font.
- All labels and eyebrows are uppercase with `tracking-ultra` (0.3em).
- Headings use tight negative tracking.
- Financial totals use `700` weight, large size.
- Buttons use bold uppercase text.

## 3. Spacing & Layout

### Base Spacing Scale

Use a 4px base spacing system.

| Token | Value |
|---|---|
| `space-1` | `4px` |
| `space-1.5` | `6px` |
| `space-2` | `8px` |
| `space-3` | `12px` |
| `space-4` | `16px` |
| `space-5` | `20px` |
| `space-6` | `24px` |
| `space-7` | `28px` |
| `space-8` | `32px` |
| `space-10` | `40px` |
| `space-12` | `48px` |

### Core Layout Values

| Pattern | Value |
|---|---|
| App max width | `80rem` / `1280px` (`max-w-7xl`) |
| Desktop page horizontal padding | `32px` |
| Tablet page horizontal padding | `24px` |
| Mobile page horizontal padding | `16px` |
| Mobile page vertical padding | `24px` |
| Desktop page vertical padding | `40px` |
| Main section gap | `32px` |
| Grid gap, major screen modules | `24px` |
| Grid gap, secondary modules | `20px` |

### Sidebar and Shell

| Item | Value |
|---|---|
| Desktop sidebar expanded width | `16rem` / `256px` |
| Desktop sidebar collapsed width | `5rem` / `80px` |
| Desktop shell inner gap | `16px` |
| Header control height | `48px` |
| Mobile bottom nav height target | `64px` to `72px` |

### Content Width Guidance

- Dashboard and analytics content should fill the available content column inside the `1280px` page container.
- Dense forms should cap at `720px` to `800px` when presented standalone.
- Long-form content blocks should stay near `42rem` to `48rem` readable width.

### Card Padding and Gaps

| Pattern | Value |
|---|---|
| Small card padding | `16px` |
| Standard card padding | `20px` |
| Large feature card padding | `24px` |
| Hero card padding | `24px` mobile, `32px` tablet, `40px` desktop |
| Stack gap inside cards | `12px` |
| Section gap inside cards | `16px` |

## 4. Component Style Direction

### Border Radius

| Token | Value | Usage |
|---|---|---|
| Default | `0px` | Buttons, badges, chips — sharp by default |
| `rounded-lg` | `10px` | Cards, inputs, dialogs, tooltips |
| `rounded-xl` | `18px` | Large containers, feature cards |
| `rounded-full` | `9999px` | Avatars only |

Direction: sharp and geometric by default. Slight rounding only for cards and inputs. No pill shapes except avatars.

### Border Usage

| Pattern | Value | Usage |
|---|---|---|
| Thick structural | `2px solid #000` | Cards, activity rows, form containers |
| Feature highlight | `4px solid #00D26A` | Hero app card, feature sections |
| Default subtle | `1px solid rgba(0,0,0,0.12)` | Dividers, secondary cards |
| Thick on inputs | `2px solid rgba(0,0,0,0.12)` | Form inputs, textareas |

Rule: visual hierarchy is driven by thick borders and color contrast, not shadows.

### Shadow Usage

| Token | Value | Usage |
|---|---|---|
| `shadow-soft` | `0 8px 24px rgba(0, 0, 0, 0.08)` | Floating elements, dialogs |
| `shadow-panel` | `0 4px 12px rgba(0, 0, 0, 0.06)` | Elevated panels |
| `shadow-subtle` | `0 1px 2px rgba(0, 0, 0, 0.04)` | Minor elevation |

Rule: shadows are minimal. Use borders for hierarchy, not shadows.

### Density

- Overall feel: high-contrast, bold, graphic
- Top-level numbers and action areas: spacious with large type
- Lists and feeds: compact with thick border separators
- Cards use thick borders and high-contrast color blocks

### Button Styles

| Button | Style | Use |
|---|---|---|
| Primary | `hotgreen` fill, black text, sharp (`rounded-none`), bold uppercase, large padding | Main page action, save, add expense, create group |
| Secondary / Outline | White or transparent bg, thick `2px` black border, black text, sharp | Alternate action |
| Ghost | Transparent background, no border, hover shows accent | Low-emphasis controls |
| Inverted | Black fill, white text, sharp | Actions on colored surfaces |

Rules:

- All buttons are sharp (no rounded corners).
- Button text is always uppercase and bold.
- Do not use shadows on buttons.

### Input Field Styling

| Property | Value |
|---|---|
| Background | `transparent` or `#FFFFFF` |
| Border | `2px solid rgba(0, 0, 0, 0.12)` |
| Radius | `10px` (`rounded-lg`) |
| Padding | `14px 16px` |
| Label style | `12px`, `700`, uppercase, `tracking-ultra` |
| Text style | `16px`, `400` or `700` for amount fields |

Rules:

- Labels sit above fields, uppercase with wide tracking.
- Inputs use thick borders, not filled backgrounds.
- Focus ring uses hotgreen.

### Card and Container Patterns

| Pattern | Style |
|---|---|
| Summary card | Black fill, white text, hotgreen accents |
| Standard card | White background, thick `2px` black border, `rounded-lg` (10px) |
| Stat block | Hotgreen fill, black text, sharp corners |
| Feature card | White bg, `1px` border, shadow-md, sharp |
| Data row | White bg, thick `2px` black border container, divide-y |
| Accent card | `#FACC15` fill, black text, sharp |

## 5. Key Layout Patterns

### App Shell Structure

- Desktop: left sidebar + content panel
- Desktop sidebar:
  - Width `256px` expanded
  - Width `80px` collapsed
  - Black background
  - Hotgreen active state indicators
  - Uppercase nav labels with `tracking-ultra`
  - Sharp edges (no rounded corners)
- Content panel:
  - Flat `#F5F5F0` background
  - No rounded container wrapper
  - Inner modules use black/white/green cards
- Mobile:
  - Black header with SPLIT + hotgreen FREE logo
  - Avatar button top-right
  - Bottom nav with black background
  - Hotgreen active indicators on nav items
  - Raised circular `+` button in center
  - Sharp edges everywhere except the `+` button
  - `2px` hotgreen top border on bottom nav

### Form Layouts

- Use a single-column layout on mobile.
- Move to 2 columns only when related fields benefit from side-by-side comparison.
- Group fields into clear sections instead of long uninterrupted forms.
- Labels are always uppercase with tracking-ultra.
- Section headers use eyebrow style: small, uppercase, hotgreen on dark or textsec on light.

### Card Grid and List Patterns

- Dashboard summary metrics: bold black card with large numbers and hotgreen accents
- Group cards: compact rows with thick border container
- Activity feed: stacked list inside a thick-bordered container with divide-y
- Stats: grid of color-blocked cards (hotgreen, white, accent)

### Empty State Patterns

- Use thick-bordered container with centered content.
- Bold headline, supporting text in textsec.
- Primary hotgreen CTA button.

### Loading State Patterns

- Use skeleton rows matching final layout shape.
- Subtle pulsing on `#F5F5F0` background.
- Keep loading placeholders stable in height.

## 6. Responsive Breakpoints

### Breakpoint Definitions

| Breakpoint | Min Width | Use |
|---|---|---|
| Mobile | `0px` | Default layout |
| Small | `640px` | Wider stacks and action rows |
| Tablet | `768px` | 2-column forms when appropriate |
| Desktop | `1024px` | Sidebar shell begins |
| Large desktop | `1280px` | Full multi-column compositions |

### Navigation and Sidebar Behavior

- Under `1024px`:
  - Hide persistent desktop sidebar
  - Use black top header plus black bottom navigation
  - Hotgreen active indicators
- At `1024px` and above:
  - Show persistent black sidebar
  - Remove bottom navigation
- At `1280px` and above:
  - Full desktop compositions

## shadcn Theme Mapping

Use the following values as the theme mapping:

```css
:root {
  --background: #F5F5F0;
  --foreground: #000000;
  --card: #FFFFFF;
  --card-foreground: #000000;
  --popover: #FFFFFF;
  --popover-foreground: #000000;
  --primary: #00D26A;
  --primary-foreground: #000000;
  --secondary: #FFFDF7;
  --secondary-foreground: #000000;
  --muted: #F5F5F0;
  --muted-foreground: #404040;
  --accent: #FACC15;
  --accent-foreground: #000000;
  --destructive: #FF3B30;
  --destructive-foreground: #FFFFFF;
  --border: rgba(0, 0, 0, 0.12);
  --input: rgba(0, 0, 0, 0.12);
  --ring: #00D26A;
  --radius: 0px;
  --chart-1: #00D26A;
  --chart-2: #22C55E;
  --chart-3: #FACC15;
  --chart-4: #84CC16;
  --chart-5: #404040;
}
```

Additional implementation notes:

- Default radius is `0px` (sharp). Use `rounded-lg` (10px) for cards and inputs.
- Visual hierarchy comes from thick borders and color contrast, not shadows.
- Use `Space Grotesk` everywhere. No secondary font needed.
- All labels use uppercase with generous tracking.

## Non-Negotiable Rules

- Use INR formatting everywhere money is prominent.
- Keep the UI bold, high-contrast, and graphic. Avoid soft, rounded, or pastel aesthetics.
- Prioritize balance visibility, action clarity, and quick expense entry.
- No dark mode. Single theme only.
- Thick borders over shadows for visual hierarchy.
- All buttons are sharp (rounded-none) with uppercase bold text.
