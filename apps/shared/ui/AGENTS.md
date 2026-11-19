# Shared UI styling

Read [the package README](README.md) before changing shared components or styles. These conventions apply throughout this package, including styles and stories.

## Components and visual defaults

- Search existing primitives, components, variants and utility styles before adding another implementation. Compose existing controls before creating new controls or styling APIs.
- Use Tailwind utilities and existing semantic tokens for layout and appearance. Prefer the established spacing, typography and radius scales over arbitrary values. A custom value needs a concrete requirement, even inside a utility class.
- Keep a reusable control's visual defaults and states in its owning component or existing variant definition. Correct a wrong shared default there instead of having callers repeat compensating overrides.
- For example, consume `Button variant="outline"` for outlined controls rather than rebuilding its ring, padding and hover rules. Prefer inset rings.
- Keep host-specific selectors, resets and token bridges in the consuming app. Shared controls consume semantic tokens; do not add host selectors, change tokens or add `data-*` selector hooks to patch one host's component appearance.
- Use complete, statically discoverable Tailwind class names. Map finite choices to complete class strings rather than interpolating utility names.

## CSS and inline styles

- Handwritten CSS is an exception for shared rendered-content rules, third-party renderer integration, or motion/accessibility behavior that utilities and existing components cannot adequately express. Ordinary controls and layouts should not gain parallel feature-specific stylesheets.
- Keep each exception with its existing owner in `src/styles/utilities/` or the relevant integration. Explain the target DOM, requirement and why utilities are insufficient beside the rule; include a source or reproduction when applicable.
- Reserve inline styles for runtime or content-provided values such as measured height and renderer-generated token styles. Keep static appearance in utilities.
- Preserve reduced-motion behavior and visible keyboard focus when changing shared treatments. Verify affected consumers and stories, including narrow widths and light/dark themes; check host integration in the consuming app.
