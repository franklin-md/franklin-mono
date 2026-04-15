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
@import '@franklin/ui/styles/utilities/prose-content.css';

@source '../src/**/*.{ts,tsx}';
@source '../node_modules/@franklin/ui';
```

Notes:

- `@source` paths are relative to the stylesheet that declares them.
- Add a `@source` for `@franklin/ui` anywhere you consume the shared
  components, otherwise Tailwind will not emit the classes used by the package.
- If your app imports Tailwind in a different form, for example
  `tailwindcss/theme` plus `tailwindcss/utilities`, the same `@source` rule
  still applies.

### Theme Variables

`@franklin/ui/styles/theme-tokens.css` maps app-defined CSS variables onto
Tailwind tokens used by the components.
`@franklin/ui/styles/utilities/prose-content.css` provides the shared
rendered-text styling used by the conversation UI. Your app still needs to
define the underlying variables, for example:

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

### Franklin Theme

If you want the default Franklin palette and typography, import:

```css
@import '@franklin/ui/styles/franklin.css';
```

`franklin.css` composes the shared token mapping, shared markdown/rendered-text
styles, and the default Franklin light/dark theme. `franklin-theme.css` is the
Franklin theme layer for apps that want to compose the pieces manually.

### Utility Styles

If you use the shared Streamdown-based text renderer without the full Franklin
theme bundle, import the utility bundle:

```css
@import '@franklin/ui/styles/utilities/index.css';
```

`styles/utilities/index.css` composes the shared prose/content styles together
with the KaTeX and Streamdown integration in `styles/utilities/markdown.css`.
Import `styles/utilities/prose-content.css` directly when you only want the
shared prose/code styles without the third-party markdown layer.

## Minimal Consumer Checklist

- Import components from `@franklin/ui`.
- Import `@franklin/ui/styles/theme-tokens.css`.
- Add `@source '../node_modules/@franklin/ui';` to the app stylesheet.
- Import `@franklin/ui/styles/utilities/prose-content.css` or
  `@franklin/ui/styles/utilities/index.css` if you render shared conversation
  text.
- Define the CSS variables consumed by `theme-tokens.css`.
