---
name: Vibrant Analytical System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d2daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e8eeff'
  surface-container-high: '#e0e8fd'
  surface-container-highest: '#dbe2f8'
  on-surface: '#141c2b'
  on-surface-variant: '#4a4455'
  inverse-surface: '#293040'
  inverse-on-surface: '#ecf0ff'
  outline: '#7b7487'
  outline-variant: '#ccc3d8'
  surface-tint: '#742be8'
  primary: '#650cd9'
  on-primary: '#ffffff'
  primary-container: '#7e3af2'
  on-primary-container: '#efe3ff'
  inverse-primary: '#d2bbff'
  secondary: '#006973'
  on-secondary: '#ffffff'
  secondary-container: '#85efff'
  on-secondary-container: '#006d78'
  tertiary: '#952a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#bf3800'
  on-tertiary-container: '#ffe2da'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#92f1ff'
  secondary-fixed-dim: '#6ad6e5'
  on-secondary-fixed: '#001f23'
  on-secondary-fixed-variant: '#004f57'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59e'
  on-tertiary-fixed: '#3a0b00'
  on-tertiary-fixed-variant: '#852400'
  background: '#f9f9ff'
  on-background: '#141c2b'
  surface-variant: '#dbe2f8'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  kpi-number:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2rem
  card-padding: 1.25rem
  stack-sm: 0.5rem
  stack-md: 1rem
---

## Brand & Style

The design system is engineered for high-performance operations, blending a **Corporate Modern** foundation with **Vibrant SaaS** accents. It prioritizes clarity and rapid data consumption while maintaining an energetic, tech-forward personality.

The aesthetic is defined by:
- **Functional Density:** Information is packed tightly but remains legible through strict mathematical spacing and clear typographic hierarchy.
- **Action-Oriented Energy:** The use of saturated violets and electric blues guides the eye to primary actions and system highlights.
- **Polished Precision:** Subtle shadows and soft corner radii create a professional "software-as-a-service" feel that is both approachable and authoritative.

## Colors

The palette utilizes a "clean-and-pop" strategy. Surfaces are kept neutral to allow data and brand accents to provide visual orientation.

- **Primary (Electric Violet):** Used for the hero dashboard banners, primary buttons, and active states in the navigation. 
- **Secondary (Teal/Cyan):** Used for supporting actions, positive trend indicators, and specific data categories in charts.
- **Neutrals:** A range of cool grays (`#F9FAFB` for backgrounds, `#FFFFFF` for cards) provides the canvas. Text uses a deep slate (`#111928`) for maximum contrast.
- **Semantic Colors:** Success is tracked in emerald green, while warnings or negative trends utilize a crisp coral-red.

## Typography

This design system employs a dual-font strategy. **Plus Jakarta Sans** provides a modern, slightly rounded geometric feel for headlines and hero numbers, while **Inter** handles the heavy lifting for data tables, labels, and body text due to its exceptional legibility at small sizes.

- **Headlines:** Use tight letter spacing for a compact, professional look.
- **KPIs:** Numbers in dashboard cards should be bold and prominent.
- **Data Tables:** Use `body-md` for row content to maximize information density without sacrificing readability.

## Layout & Spacing

The layout follows a **Fluid Grid** system within a fixed-width container for desktop, ensuring consistent information density across various monitor sizes.

- **Grid Model:** 12-column layout for desktop, 4-column for mobile.
- **Sidebar:** A fixed-width sidebar (260px) persists on desktop, collapsing to a hamburger menu on mobile.
- **KPI Grid:** Cards should utilize a flexible auto-layout wrapper that allows 4-up columns on desktop, 2-up on tablet, and 1-up on mobile.
- **Spacing Rhythm:** An 8px base unit is used for all internal component spacing (8, 16, 24, 32, 40).

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layers** and subtle **Ambient Shadows**.

- **Level 0 (Background):** Light gray (`#F3F4F6`) creates a grounded base.
- **Level 1 (Cards/Surfaces):** Pure white (`#FFFFFF`) cards sit on the background with a very soft, diffused shadow (`0px 1px 3px rgba(0,0,0,0.1)`).
- **Level 2 (Dropdowns/Modals):** These use a more pronounced shadow to indicate significant height above the dashboard.
- **Interactive States:** Buttons and cards may feature a slight "lift" effect (increase in shadow spread) on hover to indicate interactivity.

## Shapes

The shape language is consistently **Rounded**, striking a balance between friendly modern software and professional utility.

- **Standard Radius:** 8px (0.5rem) for cards, input fields, and buttons.
- **Inner Radius:** 4px (0.25rem) for small elements like checkboxes or nested status tags.
- **Pill Shapes:** Used exclusively for status badges (e.g., "Active", "Pending") and toggle switches.

## Components

### Buttons
- **Primary:** Solid Violet background with white text. High contrast.
- **Secondary:** White background with Violet border and text. 
- **Ghost:** No border or background until hover.

### KPI Cards
White background, 8px radius. Features a top-aligned icon in a soft tinted circular container, followed by a label, a large bold number, and a small footer showing percentage trends (Green for up, Red for down).

### Data Tables
Border-less rows with a subtle divider line (`#E5E7EB`). Headers are in `label-bold` with a light gray background. Row height is compact (approx 48-56px).

### Status Badges
Small, pill-shaped components with a light tinted background and dark saturated text of the same hue (e.g., Light Green background with Dark Green text).

### Charts
Simple, flat bar and line charts. No heavy 3D effects. Grid lines should be very faint (`#F3F4F6`). Use the Primary and Secondary colors for data series.