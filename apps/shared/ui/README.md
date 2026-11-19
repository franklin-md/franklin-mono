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

Completed chat footers show elapsed time and total model cost in US cents,
including model calls made during tool continuations. Costs use at most one
decimal place (for example, `1.4¢` or `2¢`); an explicitly reported zero shows
`0¢` and other values below 0.1 cents show `< 0.1¢`. Totals use provider billing when
available, otherwise catalog estimates. Unknown costs and their separator are hidden.
Hover or focus elapsed time for token counts.

## Outlined controls

`Button`'s `outline` variant uses an inset ring with the existing input token. This keeps the outline visible without changing the control's layout size. Consumers can use the variant directly instead of combining border removal and ring overrides.

## Icon action groups

`IconActionGroup` renders a toolbar of icon buttons:

```tsx
<IconActionGroup label="Presets" actions={actions} onAction={runPreset} />
```

Each action has an `id`, `label`, `icon`, optional `description`, and optional `colorClassName` / `selectedClassName`. Arrow keys, Home/End, Enter and Space work within the icon group. Inputs and adjacent pickers retain their own keys. Callers own pending/error state and can disable the group and supply `busyId` while saving. Tooltips provide descriptive labels; interactive content stays in the popover.

The component composes the existing [Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip) with [Radix Roving Focus](https://github.com/radix-ui/primitives/tree/main/packages/react/roving-focus). Roving Focus owns the tab stop and wrapping navigation; both arrow-key pairs navigate the horizontal group. Enter and Space use native button activation.

The group does not intercept window-level keyboard events. Hosts must isolate editor hotkeys at their integration boundary. Popover wrappers must let Tab and Shift+Tab reach the controls so roving focus can move out of the group.

## Icon grid and color swatches

`IconGrid` and `ColorSwatches` are single-field pickers. Each is controlled through `value` and `onChange(value)` and owns no form state, so it binds to `useState`, a store or a form library field. Compose them in the caller's own popover, dropdown or inline surface:

```tsx
<PopoverContent className="flex w-max flex-col overflow-hidden">
	<IconGrid
		icons={icons}
		value={icon}
		renderIcon={HostIcon}
		className={colorClassName}
		onChange={(id) => {
			setIcon(id);
			setOpen(false);
		}}
	/>
	<ColorSwatches options={colors} value={color} onChange={setColor} />
</PopoverContent>
```

Hosts own the icon source. `icons` lists `{ id, label, keywords? }`, and `renderIcon` draws an ID with a `className`. This keeps large registries, such as Obsidian's, out of this package. `className` applies text-color utilities to the whole grid, for example to preview a separately chosen color.

Every search term must match an icon's ID, label or keyword; leading matches rank first. Arrow keys move the active cell in a fixed 8-column grid while focus stays in the search input, following the [combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/). Enter or a click calls `onChange`; closing a surrounding popover is the caller's choice. Home, End and text editing stay with the input. The search input is the grid's first focusable control, so Radix Popover focuses it on open when the grid comes first.

`ColorSwatches` renders native radios with arrow-key navigation. Each option supplies complete `colorClassName` text-color utilities, and swatches draw with `currentColor`. `label` names the group and defaults to "Color".

## Shared prompt controls

`PromptSurface`, `PromptFooter`, `PromptFooterControls`, and `PromptSubmitButton` compose the same prompt appearance around host-owned input and submission behavior. `PromptContainer` adds chat's outer spacing; `PromptSurface` can also style an existing form with `asChild`.

`ModelPicker` is a prebuilt recipe with caller-owned model and optional effort state. It does not read or change an active agent:

```tsx
<ModelPicker
	provider={provider}
	model={model}
	onSelect={onSelectModel}
	effort={{ level, levels, onChange: onChangeReasoning }}
/>
```

Omit `effort` for a model-only picker. The effort row stays below the scrolling model list and is not filtered by search. Its inline radio choices use a pill to mark the current level; selecting one keeps the picker open. Native radio-group keyboard navigation supports arrow keys and Space. All six `THINKING_LEVELS` fit on one row at the default popover width; choices wrap onto further rows when the popover is narrower, so every level stays visible. Escape closes the popover and returns focus to the trigger. Each caller supplies its available levels; the UI does not infer model capabilities or change reasoning when selecting a model. Model-aware level filtering is deferred under `franklin-drf`.

The default trigger shows the model followed by the compact effort label in muted text at the same font size. The model name truncates before the effort label. Its tooltip and accessible description retain the full level name. Omitting `effort` removes both the inline selector and the trigger's effort summary.

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
			<ModelPickerEffort
				level={level}
				levels={levels}
				onChange={onChangeReasoning}
			/>
		</ModelPickerFooter>
	</ModelPickerContent>
</ModelPickerRoot>
```

Remove `ModelPickerSearch` for an unfiltered list, or remove the footer for no effort control. Add other React controls to the footer as needed. The trigger supports `asChild` for a custom button. Models absent from the catalog retain their saved identity in the default trigger. The parts use the existing [Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover) and [cmdk](https://github.com/pacocoursey/cmdk) implementations for popup and command navigation; `@franklin/react` remains the headless hooks layer.

The parts need no agent or application harness. `ModelPickerList` renders no authentication controls unless `renderProviderAction` is supplied. The prebuilt recipe defaults to `MODEL_CATALOG` and Franklin's authentication shortcuts, which use the host's harness and `AuthActionProvider`. Override `catalog` and `renderProviderAction` on the recipe for another host, or use `() => null` to omit authentication controls.

`MODEL_CATALOG` curates IDs, friendly labels, ordering and access groups. Its
reasoning, context and price estimates come from the same local
`@franklin/mini-acp/models` resolver used for requests. Unresolved curated entries
are omitted; saved IDs and caller-supplied catalogs retain their existing behavior.
A direct data-only import of this catalog now includes Pi's bundled registry;
the full picker already depends on the SDK.

`ModelSelector` binds the recipe to chat's existing model and thinking hooks.
Inbox supplies its persisted preferences and all supported reasoning levels, and
queues submissions independently of chat. Standalone `ThinkingControl` and
`ThinkingToggle` remain available for other compositions. Reusing the prompt
surface does not require TipTap or mentions.

## Composing a compact popover

Use the existing popover parts with caller-owned open state:

```tsx
<Popover open={open} onOpenChange={setOpen}>
	<PopoverTrigger asChild>
		<Button>Open tools</Button>
	</PopoverTrigger>
	<PopoverContent
		aria-label="Edit tools"
		side="top"
		align="center"
		sideOffset={6}
		collisionPadding={8}
		className="w-max max-w-[calc(100vw-1rem)] max-h-[var(--radix-popover-content-available-height)] overflow-auto p-1"
	>
		<button type="button" onClick={edit}>Edit</button>
		<textarea aria-label="Custom prompt" />
	</PopoverContent>
</Popover>
```

`w-max` sizes the surface to its contents and `p-1` provides compact spacing.
The width limit leaves an 8px margin on each side, matching `collisionPadding`.
The available-height limit and scrolling keep larger contents accessible.
Colors, typography, radius, shadow and animations use the regular popover defaults.

[Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover)
handles initial focus, Tab navigation, dismissal and returning focus to the
trigger after Escape. Clicking an outside control dismisses without taking
focus back from that control. No custom focus query, window keyboard listener
or continuous positioning override is needed for this composition.

For a virtual anchor, use the existing `PopoverAnchor virtualRef` API. An
editor-launched popup may need to intercept host commands or restore focus to
an editor instead of a trigger. Those policies belong with the host integration,
using the existing content events and ref; they are not part of compact styling.

## Minimal Consumer Checklist

- Import components from `@franklin/ui`.
- Import `@franklin/ui/styles/franklin-core.css`.
- Import `@franklin/ui/styles/franklin-theme.css` if you want Franklin's
  default theme, or define/map the semantic variables yourself.
- Define the CSS variables consumed by `franklin-core.css`.
