export function focusCommand(container: HTMLElement | null): boolean {
	const target =
		container?.querySelector<HTMLElement>('[cmdk-input]') ??
		container?.querySelector<HTMLElement>('[cmdk-list]');
	if (!target) return false;

	// Without a search input, focus the listbox so cmdk's existing Arrow/Enter
	// handling works. Its tabIndex=-1 excludes it from Radix's initial tab stops.
	// https://github.com/pacocoursey/cmdk#use-inside-popover
	target.focus();
	return true;
}
