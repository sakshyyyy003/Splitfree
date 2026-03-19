# Splitfree Design Guidelines

## Purpose

This document is the single source of truth for Splitfree UI work.

- Source mock: `docs/design/design-exploration.html`
- Scope: shadcn theme configuration, component styling, page layouts, and responsive behavior
- Product direction: warm, trustworthy, utility-first shared-finance UI for India-first INR expense sharing

## 1. Color Palette

### Brand and Core UI Colors

| Token | Hex | HSL | Usage |
|---|---|---|---|
| `ink` | `#112018` | `148 31% 10%` | Primary dark text, dark panels, high-emphasis surfaces |
| `moss` | `#1C5C43` | `157 53% 24%` | Primary brand/action color |
| `mint` | `#C8F2D3` | `136 62% 87%` | Positive accent fill, active nav, soft success surfaces |
| `foam` | `#F3FBF5` | `135 50% 97%` | Default soft surface and filled input background |
| `sand` | `#F7EFDE` | `41 61% 92%` | Secondary warm surface, supportive highlight panels |
| `peach` | `#FFD6B5` | `27 100% 85%` | Warm accent for charts and supportive callouts |
| `line` | `#D6E3D8` | `129 19% 86%` | Border and divider base |
| `white` | `#FFFFFF` | `0 0% 100%` | Primary card surface |
| `body-end` | `#F8FBF8` | `120 27% 98%` | Page gradient tail color |
| `deep-ink` | `#09120D` | `147 33% 5%` | Device mock and extra-dark accent surface |

### Semantic Colors

| Token | Hex | HSL | Usage |
|---|---|---|---|
| `success` | `#1C5C43` | `157 53% 24%` | Positive balances, confirmed actions |
| `success-soft` | `#C8F2D3` | `136 62% 87%` | Success backgrounds and highlighted active states |
| `warning` | `#F0B76A` | `34 82% 68%` | Spend alerts, chart highlight, caution state |
| `error` | `#B8402A` | `9 63% 44%` | Negative balances, destructive states |
| `info` | `#6BA889` | `150 26% 54%` | Informational chart series and supportive status states |

### Background and Surface Colors

| Context | Token / Value |
|---|---|
| App/page background | `linear-gradient(180deg, #F7EFDE 0%, #F3FBF5 22%, #F8FBF8 100%)` |
| Primary card surface | `#FFFFFF` at full opacity |
| Soft card/input surface | `#F3FBF5` |
| Secondary highlight surface | `#F7EFDE` |
| High-emphasis panel | `#112018` |
| Overlay dark surface | `#09120D` |

### Border and Divider Colors

| Context | Value |
|---|---|
| Default border | `rgba(17, 32, 24, 0.10)` |
| Slightly stronger input border | `rgba(17, 32, 24, 0.12)` |
| Dashed placeholder border | `rgba(17, 32, 24, 0.18)` |
| Divider on dark surfaces | `rgba(255, 255, 255, 0.10)` |

### Text Colors

| Token | Value | Usage |
|---|---|---|
| Text primary | `#112018` | Headings, body text, labels |
| Text secondary | `rgba(17, 32, 24, 0.72)` | Standard supporting copy |
| Text muted | `rgba(17, 32, 24, 0.55)` | Metadata, timestamps, helper text |
| Text subtle | `rgba(17, 32, 24, 0.45)` | Eyebrows, chart labels, quiet captions |
| Text on dark primary | `#FFFFFF` | Headings and main content on dark cards |
| Text on dark secondary | `rgba(255, 255, 255, 0.68)` | Supporting copy on dark cards |
| Text on dark muted | `rgba(255, 255, 255, 0.55)` | Labels and metadata on dark cards |

## 2. Typography

### Font Families

- Display font: `"Space Grotesk", ui-sans-serif, system-ui, sans-serif`
- UI/body font: `"Manrope", ui-sans-serif, system-ui, sans-serif`
- Monospace fallback for code/data when needed: `ui-monospace, SFMono-Regular, Menlo, monospace`

### Type Scale

| Style | Size | Line height | Letter spacing | Weight | Usage |
|---|---|---|---|---|---|
| `h1` | `3.75rem` / `60px` | `1.0` | `-0.03em` | `700` | Large landing hero on desktop |
| `h2` | `3rem` / `48px` | `1.05` | `-0.025em` | `700` | Large screen titles |
| `h3` | `2rem` / `32px` | `1.15` | `-0.02em` | `700` | Section titles, major card titles |
| `h4` | `1.5rem` / `24px` | `1.2` | `-0.015em` | `700` | Subsection headers |
| `title-lg` | `1.25rem` / `20px` | `1.3` | `-0.01em` | `700` | Module titles |
| `body` | `1rem` / `16px` | `1.6` | `0` | `400` | Default body copy |
| `body-sm` | `0.875rem` / `14px` | `1.55` | `0` | `400` | Secondary text, helper copy |
| `small` | `0.75rem` / `12px` | `1.4` | `0.18em` to `0.28em` uppercase | `700` | Eyebrows, status chips, labels |
| `caption` | `0.6875rem` / `11px` | `1.35` | `0.18em` uppercase | `700` | Bottom nav labels and micro labels |

### Responsive Heading Behavior

- Mobile hero heading: `2.25rem` / `36px`
- Tablet hero heading: `3rem` / `48px`
- Desktop hero heading: `3.75rem` / `60px`
- Most section titles scale from `2rem` on mobile to `3rem` on desktop

### Font Weights

- Regular: `400`
- Medium: `500`
- Semibold: `600`
- Bold: `700`
- Extra-bold: `800`

### Typography Rules

- Use `Space Grotesk` only for page-level and section-level display headings.
- Use `Manrope` for forms, buttons, tables, lists, financial values, and paragraph text.
- Financial totals can use `800` weight in `Manrope`.
- Uppercase labels should use generous tracking between `0.18em` and `0.28em`.

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

Collapsed width is not shown in the mock, but use `80px` as the implementation standard for icon-only mode.

### Content Width Guidance

- Dashboard and analytics content should generally fill the available content column inside the `1280px` page container.
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
| `radius-pill` | `9999px` | Buttons, chips, nav pills |
| `radius-2xl` | `1rem` / `16px` | Inputs, row items, compact cards |
| `radius-3xl` | `1.5rem` / `24px` | Standard cards and grouped panels |
| `radius-4xl` | `2rem` / `32px` | Hero modules and top-level screen containers |
| `radius-shell` | `2.25rem` / `36px` | Device mock and large shell wrappers |

Direction: rounded and tactile, never sharp.

### Shadow Usage

| Token | Value | Usage |
|---|---|---|
| `shadow-soft` | `0 22px 50px rgba(17, 32, 24, 0.10)` | Hero cards and major containers |
| `shadow-panel` | `0 10px 30px rgba(28, 92, 67, 0.10)` | Primary CTAs and elevated panels |
| `shadow-subtle` | `0 1px 2px rgba(17, 32, 24, 0.06)` | Small white cards on tinted backgrounds |

Rule: shadows are soft and diffused, not hard or layered aggressively.

### Density

- Overall feel: medium density
- Top-level numbers and action areas: spacious
- Lists, feeds, and split previews: compact but not cramped
- Avoid large empty gutters inside forms that slow data entry

### Button Styles

| Button | Style | Use |
|---|---|---|
| Primary | `moss` fill, white text, pill radius, `14px` text, `700` weight, `12px 20px` or `14px 24px` padding | Main page action, save, add expense, create group |
| Secondary / Outline | White or transparent background, `ink` border at 10%, `ink` text | Alternate action on light surfaces |
| Ghost | Transparent background, no border by default, hover on `mint` or `foam` | Inline nav and low-emphasis controls |
| Inverted | White fill on dark card, `moss` or `ink` text | Primary action inside dark panels |

Rules:

- Do not use multiple equally loud solid buttons in the same action cluster.
- The primary action should almost always be the rightmost or lowest final action in a form.
- Danger buttons should use the `error` token sparingly.

### Input Field Styling

| Property | Value |
|---|---|
| Background | `foam` |
| Border | `1px solid rgba(17, 32, 24, 0.12)` |
| Radius | `16px` |
| Padding | `14px 16px` |
| Label style | `14px`, `700`, `Manrope`, `ink` |
| Text style | `16px`, `400` or `800` for amount fields |

Rules:

- Labels sit above fields.
- Inputs are filled, not transparent.
- Use dashed borders only for upload states and placeholders.
- Split selector uses card buttons instead of a compact dropdown.

### Card and Container Patterns

| Pattern | Style |
|---|---|
| Summary card | Dark `ink` or solid `moss` fill with white text |
| Standard card | White background, soft border, `24px` radius, `20px` padding |
| Soft support card | `foam` or `sand` background, minimal shadow |
| Placeholder/empty/upload card | White or sand background with dashed border |
| Data row card | `16px` radius, `16px` horizontal padding, `12px` vertical padding |

## 5. Key Layout Patterns

### App Shell Structure

- Desktop: left sidebar + top header + content panel
- Desktop sidebar:
  - Width `256px` expanded
  - Width `80px` collapsed
  - Dark `ink` background
  - Quick actions stay in sidebar
- Content panel:
  - White primary working surface
  - Inner modules use a mix of white, foam, and sand cards
- Mobile:
  - Header remains visible at the top
  - Bottom nav is the default primary navigation
  - Primary add action must remain one tap away

### Form Layouts

- Use a single-column layout on mobile.
- Move to 2 columns only when related fields benefit from side-by-side comparison.
- Group fields into clear sections instead of long uninterrupted forms.
- For create-group and add-expense:
  - Identity fields first
  - Configuration/split details second
  - Optional metadata last
  - Final action cluster at the end

### Card Grid and List Patterns

- Dashboard summary metrics: 3-up on desktop, stacked on mobile
- Pinned groups: 2-column card grid on tablet/desktop, single-column on mobile
- Activity feed and expense feed: stacked list of row cards
- Analytics:
  - one chart card
  - one summary stack
  - one insights/supporting card cluster

### Empty State Patterns

- Use dashed border or soft surface container, not illustration-heavy empty states.
- Include:
  - clear title
  - one-line explanation
  - one obvious primary action
- Example patterns:
  - no groups yet
  - no expenses in a new group
  - settle-all complete

### Loading State Patterns

- Use skeleton rows and skeleton cards that match final layout shape.
- Prefer `foam`/`sand` placeholders with subtle pulsing instead of gray blocks.
- Keep loading placeholders stable in height to prevent layout shift.

## 6. Responsive Breakpoints

### Breakpoint Definitions

| Breakpoint | Min Width | Use |
|---|---|---|
| Mobile | `0px` | Default layout |
| Small | `640px` | Slightly roomier stacks and action rows |
| Tablet | `768px` | 2-column forms and wider cards when appropriate |
| Desktop | `1024px` | Sidebar shell begins |
| Large desktop | `1280px` | Full multi-column page compositions |

These follow the Tailwind defaults used by the exploration file.

### Navigation and Sidebar Behavior

- Under `1024px`:
  - hide persistent desktop sidebar
  - use top header plus bottom navigation
  - sidebar, if present, should be an overlay drawer
- At `1024px` and above:
  - show persistent sidebar
  - remove bottom navigation
- At `1280px` and above:
  - use the full desktop compositions from the mock with split content columns

## shadcn Theme Mapping

Use the following values as the first-pass light theme mapping:

```css
:root {
  --background: 120 27% 98%;
  --foreground: 148 31% 10%;
  --card: 0 0% 100%;
  --card-foreground: 148 31% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 148 31% 10%;
  --primary: 157 53% 24%;
  --primary-foreground: 0 0% 100%;
  --secondary: 135 50% 97%;
  --secondary-foreground: 148 31% 10%;
  --muted: 135 50% 97%;
  --muted-foreground: 148 12% 40%;
  --accent: 41 61% 92%;
  --accent-foreground: 148 31% 10%;
  --destructive: 9 63% 44%;
  --destructive-foreground: 0 0% 100%;
  --border: 129 19% 86%;
  --input: 129 19% 86%;
  --ring: 157 53% 24%;
  --radius: 1rem;
  --chart-1: 157 53% 24%;
  --chart-2: 150 26% 54%;
  --chart-3: 27 100% 85%;
  --chart-4: 34 82% 68%;
  --chart-5: 142 45% 70%;
}
```

Additional implementation notes:

- Override shadcn defaults that lean too grayscale.
- Use `radius-lg` and above frequently; avoid small sharp radii.
- For elevated hero modules, add custom shadows beyond the base shadcn shadow scale.
- Use `Space Grotesk` in app layout or heading components rather than trying to force it into all shadcn primitives.

## Non-Negotiable Rules

- Use INR formatting everywhere money is prominent.
- Keep the UI warm and calm; avoid neon, purple-led gradients, or high-saturation fintech styling.
- Prioritize balance visibility, action clarity, and quick expense entry over decorative density.
- Do not introduce dark mode-specific design decisions until the light theme is implemented consistently.
