// Franklin's form reset strips Obsidian's chrome from native controls
// (see styles/reset.css), so settings fields draw an Input-like outline.
export const settingFieldClassName =
	'rounded-md bg-transparent text-sm text-foreground shadow-sm ring-1 ring-inset ring-input focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
