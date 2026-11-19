# Apps

These conventions apply to every app under `apps/`, including the shared UI package (`apps/shared/ui`). Package-level `AGENTS.md` files add to them.

## Forms and pickers

- A field picker edits one field. It is controlled through `value` and `onChange(value)` and owns no form state. Keep shared field pickers, such as `IconGrid` and `ColorSwatches`, in `@franklin/ui`. Do not bundle several fields into one component, such as an "icon and color picker".
- Popovers, dropdowns and setting rows are containers. Compose field pickers inside them; the caller owns open and close, for example closing after a pick.
- Drafts with save/cancel or validation use [TanStack Form](https://tanstack.com/form/latest) (`@tanstack/react-form`), validated with the existing zod schema. Settings that apply immediately bind field pickers directly to their store.
- `@franklin/ui` does not depend on a form library. Apps adapt form fields to pickers, for example `value={field.state.value}` and `onChange={field.handleChange}`.
- Add a shared recipe only when several callers repeat the same composition. It composes public field pickers and adds no state of its own.

Library decision (2026-11-19): TanStack Form over react-hook-form for type-checked field names from the form's data type, `createFormHook` field-component registration and direct zod (Standard Schema) validation. Measured cost with esbuild, minified with React external: `@tanstack/react-form` 1.33 is 66.7 KB (17.7 KB gzip); react-hook-form 7.92 is 39.9 KB (14.3 KB gzip).
