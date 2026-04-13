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
@import '@franklin/ui/styles/theme-tokens.css';

@source '../src/**/*.{ts,tsx}';
@source '../node_modules/@franklin/ui';
```

Notes:

- `@source` paths are relative to the stylesheet that declares them.
- Use the package path in `node_modules`, not a repo-internal path like
  `apps/shared/ui/src`. That keeps consumers stable if this package moves.
- If your app imports Tailwind in a different form, for example
  `tailwindcss/theme` plus `tailwindcss/utilities`, the same `@source` rule
  still applies.

### Theme Variables

`@franklin/ui/styles/theme-tokens.css` maps app-defined CSS variables onto
Tailwind tokens used by the components. Your app still needs to define the
underlying variables, for example:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
}
```

Font variables are app-owned:

```css
@theme inline {
  --font-sans: 'Inter Variable', 'Inter', sans-serif;
  --font-mono: 'Geist Mono Variable', 'Geist Mono', monospace;
}
```

## Minimal Consumer Checklist

- Import components from `@franklin/ui`.
- Import `@franklin/ui/styles/theme-tokens.css`.
- Add `@source '../node_modules/@franklin/ui';` to the app stylesheet.
- Define the CSS variables consumed by `theme-tokens.css`.
