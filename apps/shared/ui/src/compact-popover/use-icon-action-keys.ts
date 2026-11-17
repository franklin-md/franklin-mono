import { useEffect } from 'react';
import type { UseIconActionKeysOptions } from './action-types.js';

export function useIconActionKeys({
	group,
	getButtons,
	focusAtIndex,
}: UseIconActionKeysOptions) {
	useEffect(() => {
		const element = group.current;
		const win = element?.ownerDocument.defaultView;
		if (!element || !win) return;
		const handleKey = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.isComposing ||
				event.altKey ||
				event.ctrlKey ||
				event.metaKey
			)
				return;
			const buttons = getButtons();
			const index = buttons.findIndex(
				(button) => button === element.ownerDocument.activeElement,
			);
			// Only this group's focused buttons own these keys. Adjacent inputs and
			// nested pickers keep their ordinary navigation and submission behavior.
			if (index < 0) return;
			switch (event.key) {
				case 'ArrowDown':
				case 'ArrowRight':
					focusAtIndex((index + 1) % buttons.length);
					break;
				case 'ArrowUp':
				case 'ArrowLeft':
					focusAtIndex((index + buttons.length - 1) % buttons.length);
					break;
				case 'Home':
					focusAtIndex(0);
					break;
				case 'End':
					focusAtIndex(buttons.length - 1);
					break;
				case 'Enter':
				case ' ':
					buttons[index]?.click();
					break;
				default:
					return;
			}
			event.preventDefault();
			event.stopPropagation();
		};
		// Capture before host hotkeys and React portal delegation.
		win.addEventListener('keydown', handleKey, true);
		return () => win.removeEventListener('keydown', handleKey, true);
	}, [group, getButtons, focusAtIndex]);
}
