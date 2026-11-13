# Obsidian UI styling

Read [the package README](README.md) and the [shared UI conventions](../shared/ui/AGENTS.md) before changing UI.

## Default approach

- Use `@franklin/ui` components and Tailwind utilities for application layout, spacing, typography, colors and interaction states. Search existing components, variants and sibling implementations before creating another visual recipe.
- Reuse Obsidian primitives such as `DirectivePill` where they already own a treatment. Keep reusable cross-host controls in `apps/shared/ui`.
- Prefer existing semantic tokens, type sizes, spacing and radii. Moving bespoke pixel values or color formulas into arbitrary Tailwind classes does not make them consistent with the design system.
- For example, use `Button variant="outline"` instead of a raw button with a new feature-specific outline, padding and hover stylesheet. Prefer inset rings.

## Custom CSS exceptions

- Allow handwritten CSS only for a demonstrated host/editor constraint, rendered-content integration, or shared accessibility/motion behavior that existing components and utilities cannot adequately express.
- CodeMirror `EditorView.baseTheme` and `EditorView.theme` rules count as custom CSS. Keep editor mechanics there; do not use them to duplicate ordinary shared controls or invent an independent set of visual defaults.
- Tailwind is scoped beneath `.franklin`; editor decorations may live outside that scope. Check the actual mount boundary first. Use the existing scoped mounting helpers for owned UI where appropriate; do not add `.franklin` to the whole editor or add global prefix exceptions to make feature styling work.
- Keep static styling in utilities or the justified stylesheet. Inline styles are for runtime values such as measured geometry or host-configured blink rate.
- Explain each new CSS exception beside its rule: the affected DOM, the concrete constraint, why the normal approach is insufficient, and a source or reproduction.
- Keep host resets and theme mappings in `src/styles/`. Keep feature exceptions beside their owner and use `globals.css` as the stylesheet composition point. Do not change semantic tokens or add `data-*` selector hooks to patch one control.

## Verification

For styling changes, check the affected surface with Obsidian host CSS in light and dark themes, at narrow widths and with changed host font size. Check keyboard focus and reduced motion; for editor changes also check empty, wrapped and multiline prompts where relevant. Report source checks, bundle creation and installed-plugin verification separately. Storybook's variable snapshot alone does not verify the host's native element styles.
