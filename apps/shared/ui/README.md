# `@franklin/ui`

Shared React UI components for Franklin.

## Consuming This Package

There are two parts to consuming `@franklin/ui` correctly:

1. Import the React components from `@franklin/ui`.
2. Make sure Tailwind scans `@franklin/ui`, otherwise the shared utility
   classes will not be emitted into your app's CSS.

### React Usage

Import components from the package root:

```tsx
import { Button, ConversationPanel, Tabs } from '@franklin/ui';
```

### Tailwind Setup

In your app stylesheet:

```css
@import 'tailwindcss';
@import '@franklin/ui/styles/franklin-core.css';
```

Notes:

- `@source` paths are relative to the stylesheet that declares them.
- `franklin-core.css` already scans the `@franklin/ui` source tree, so
  consumers only need to add `@source` rules for their own app code when
  Tailwind cannot discover them automatically.
- If your app imports Tailwind in a different form, for example
  `tailwindcss/theme` plus `tailwindcss/utilities`, the same `@source` rule
  still applies.

### Theme Variables

`@franklin/ui/styles/franklin-core.css` bundles the shared token mapping,
prose/content styles, markdown utility styles, and package `@source` scanning.
Your app still needs to define the semantic CSS variables it consumes, for
example:

```css
:root {
  --background: oklch(0.96 0.012 88);
  --foreground: oklch(0.21 0.040 302);
  --card: oklch(0.99 0.008 88);
  --card-foreground: oklch(0.21 0.040 302);
  --popover: oklch(0.99 0.008 88);
  --popover-foreground: oklch(0.21 0.040 302);
  --primary: oklch(0.21 0.040 302);
  --primary-foreground: oklch(0.92 0.035 88);
  --secondary: oklch(0.90 0.018 88);
  --secondary-foreground: oklch(0.28 0.038 302);
  --muted: oklch(0.92 0.014 88);
  --muted-foreground: oklch(0.48 0.022 302);
  --accent: oklch(0.88 0.020 88);
  --accent-foreground: oklch(0.25 0.040 302);
  --destructive: oklch(0.55 0.20 22);
  --destructive-foreground: oklch(0.97 0.005 88);
  --border: oklch(0.82 0.018 88);
  --input: oklch(0.82 0.018 88);
  --ring: oklch(0.21 0.040 302);
  --radius: 0.5rem;
}
```

Font variables are app-owned:

```css
@theme inline {
  --font-sans: 'Inter Variable', 'Inter', sans-serif;
  --font-mono: 'Geist Mono Variable', 'Geist Mono', monospace;
}
```

### Franklin Theme

If you want the default Franklin palette and typography, import:

```css
@import '@franklin/ui/styles/franklin-core.css';
@import '@franklin/ui/styles/franklin-theme.css';
```

That is the default-theme composition used by the demo app and Storybook.

For host-integrated surfaces such as Obsidian, import `franklin-core.css` and
map the host theme variables onto Franklin's semantic variables instead of
importing `franklin-theme.css`.

### Utility Styles

If you use the shared Streamdown-based text renderer without the full Franklin
theme bundle, import the utility bundle:

```css
@import '@franklin/ui/styles/utilities/index.css';
```

`styles/utilities/index.css` composes the shared prose/content styles together
with the KaTeX and Streamdown integration in `styles/utilities/markdown.css`.
Import `styles/utilities/prose-content.css` directly when you only want the
shared prose/code styles without the third-party markdown layer. These utility
files do not scan `@franklin/ui`; `franklin-core.css` is the shared entry point
that owns package `@source` scanning.

## Minimal Consumer Checklist

- Import components from `@franklin/ui`.
- Import `@franklin/ui/styles/franklin-core.css`.
- Import `@franklin/ui/styles/franklin-theme.css` if you want Franklin's
  default theme, or define/map the semantic variables yourself.
- Define the CSS variables consumed by `franklin-core.css`.
