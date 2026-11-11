export function hasTextSelection(element: HTMLElement): boolean {
	return element.ownerDocument.getSelection()?.isCollapsed === false;
}
