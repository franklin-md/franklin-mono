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
import { Button, ConversationTranscript, Tabs } from '@franklin/ui';
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

## Conversation Activity

Conversation views collapse intermediate activity by default. The current action
slides into one row while running; completed turns show thinking/tool counts and
elapsed time. Expand the row to inspect the original sequence. Trailing answer
text and turn errors remain visible. Explicitly opened activity stays open as
the turn progresses. Motion respects `prefers-reduced-motion`.
Completed summaries include up to three distinct icons from visible tool calls,
using the registry's optional `icon` renderer and a generic tool icon as fallback.

Pass `toolRegistry` to `ConversationView` or `ConversationTranscript` to share
host-specific tool summaries between the activity row and its expanded details.
The headless `ConversationComponents.Activity` slot can replace the grouping UI.
Text before the last thinking/tool block is treated as progress; trailing text
is treated as the answer because the protocol does not distinguish the two.

`ActivityDisclosure` is also exported for other workflows. It accepts `summary`,
an optional `summaryPrefix`, `current: { id, content }`, `running`, `errors`, `meta`, and children
for the expanded details. Keep the current action's ID stable while its content
streams; change it when a new action starts to trigger the vertical transition.

## Outlined controls

`Button`'s `outline` variant uses an inset ring with the existing input token. This keeps the outline visible without changing the control's layout size. Consumers can use the variant directly instead of combining border removal and ring overrides.

## Shared prompt controls

`PromptSurface`, `PromptFooter`, `PromptFooterControls`, and
`PromptSubmitButton` compose the same prompt appearance around host-owned
input and submission behavior. `PromptContainer` adds chat's outer spacing;
`PromptSurface` can also style an existing form with `asChild`.

`ModelPicker` is a prebuilt recipe with caller-owned model and optional effort
state. It does not read or change an active agent:

```tsx
<ModelPicker
  provider={provider}
  model={model}
  onSelect={onSelectModel}
  effort={{ level, levels, onChange: onChangeReasoning }}
/>
```

Omit `effort` for a model-only picker. The effort row stays below the scrolling
model list and is not filtered by search. Its inline radio choices use a pill to
mark the current level; selecting one keeps the picker open. Native radio-group
keyboard navigation supports arrow keys and Space. Choices scroll horizontally
when needed, revealing the selected level on reopen or external changes. Escape
closes the popover and returns focus to the trigger. Each caller supplies its
available levels; the UI does not infer model capabilities or change reasoning
when selecting a model.

The default trigger shows the model followed by the compact effort label in
smaller, muted text. The model name truncates before the effort label. Its tooltip
and accessible description retain the full level name. Omitting `effort` removes
both the inline selector and the trigger's effort summary.

For custom compositions, import these parts from `@franklin/ui`:

```tsx
<ModelPickerRoot
  catalog={catalog}
  provider={provider}
  model={model}
  onSelect={onSelectModel}
>
  <ModelPickerTrigger effort={level} />
  <ModelPickerContent>
    <ModelPickerModels>
      <ModelPickerSearch />
      <ModelPickerList renderProviderAction={renderProviderAction} />
    </ModelPickerModels>
    <ModelPickerFooter>
      <ModelPickerEffort level={level} levels={levels} onChange={onChangeReasoning} />
    </ModelPickerFooter>
  </ModelPickerContent>
</ModelPickerRoot>
```

Remove `ModelPickerSearch` for an unfiltered list, or remove the footer for no
effort control. Add other React controls to the footer as needed. The trigger
supports `asChild` for a custom button. Models absent from the catalog retain
their saved identity in the default trigger. The parts use the existing
[Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover) and
[cmdk](https://github.com/pacocoursey/cmdk) implementations for popup and command
navigation; `@franklin/react` remains the headless hooks layer.

The parts need no agent or application harness. `ModelPickerList` renders no
authentication controls unless `renderProviderAction` is supplied. The prebuilt
recipe defaults to `MODEL_CATALOG` and Franklin's authentication shortcuts, which
use the host's harness and `AuthActionProvider`. Override `catalog` and
`renderProviderAction` on the recipe for another host, or use `() => null` to
omit authentication controls.

`ModelSelector` binds the recipe to chat's existing model and thinking hooks.
Inbox supplies its persisted preferences and all six reasoning levels, and
queues submissions independently of chat. Standalone `ThinkingControl` and
`ThinkingToggle` remain available for other compositions. Reusing the prompt
surface does not require TipTap or mentions.

## Minimal Consumer Checklist

- Import components from `@franklin/ui`.
- Import `@franklin/ui/styles/franklin-core.css`.
- Import `@franklin/ui/styles/franklin-theme.css` if you want Franklin's
  default theme, or define/map the semantic variables yourself.
- Define the CSS variables consumed by `franklin-core.css`.
