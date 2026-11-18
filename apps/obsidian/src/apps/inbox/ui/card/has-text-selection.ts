export function hasTextSelection(
	element: HTMLElement,
	clickDetail: number,
): boolean {
	// Keyboard and assistive-technology activation must not be blocked by a selection.
	if (clickDetail === 0) return false;
	const selection = element.ownerDocument.getSelection();
	if (!selection || selection.isCollapsed) return false;
	for (let index = 0; index < selection.rangeCount; index++) {
		if (selection.getRangeAt(index).intersectsNode(element)) return true;
	}
	return false;
}
