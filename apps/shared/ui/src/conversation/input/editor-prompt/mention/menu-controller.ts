import type { Dispatch, SetStateAction } from 'react';
import type { FileReferenceItem } from '@franklin/react';

type ShowMenuOptions = {
	readonly query: string;
	readonly anchorRect: DOMRect | undefined;
	readonly command: (item: FileReferenceItem) => void;
};

export interface ActiveMentionSuggestionState extends ShowMenuOptions {
	readonly active: true;
	readonly highlightedIndex: number;
}

export type MentionSuggestionState =
	| { readonly active: false }
	| ActiveMentionSuggestionState;

export const inactiveMentionSuggestion: MentionSuggestionState = {
	active: false,
};

export interface MenuKeyEvent {
	readonly key: string;
	preventDefault(): void;
}

interface CreateMenuControllerOptions {
	readonly getItems: () => readonly FileReferenceItem[];
	readonly setSuggestionState: Dispatch<SetStateAction<MentionSuggestionState>>;
}

export interface MenuController {
	readonly show: (options: ShowMenuOptions) => void;
	readonly exit: () => void;
	readonly highlight: (index: number) => void;
	readonly handleKeyDown: (event: MenuKeyEvent) => boolean;
}

function clampIndex(index: number, length: number): number {
	if (length <= 0) {
		return 0;
	}
	return Math.max(0, Math.min(index, length - 1));
}

function wrapIndex(index: number, length: number): number {
	if (length <= 0) {
		return 0;
	}
	return (index + length) % length;
}

export function createMenuController({
	getItems,
	setSuggestionState,
}: CreateMenuControllerOptions): MenuController {
	let activeMenu: ShowMenuOptions | undefined;
	let highlightedIndex = 0;

	const publish = () => {
		if (!activeMenu) {
			setSuggestionState(inactiveMentionSuggestion);
			return;
		}

		setSuggestionState({
			active: true,
			query: activeMenu.query,
			anchorRect: activeMenu.anchorRect,
			highlightedIndex,
			command: commitItem,
		});
	};

	const exit = () => {
		activeMenu = undefined;
		highlightedIndex = 0;
		setSuggestionState(inactiveMentionSuggestion);
	};

	const commitItem = (item: FileReferenceItem) => {
		if (!activeMenu) {
			return;
		}

		activeMenu.command(item);
		exit();
	};

	const commitHighlighted = () => {
		const item = getItems()[highlightedIndex];
		if (item === undefined) {
			return;
		}

		commitItem(item);
	};

	const highlight = (index: number) => {
		highlightedIndex = clampIndex(index, getItems().length);
		publish();
	};

	const move = (delta: number) => {
		const length = getItems().length;
		if (length === 0) {
			return;
		}

		highlightedIndex = wrapIndex(highlightedIndex + delta, length);
		publish();
	};

	return {
		show: (options) => {
			activeMenu = options;
			highlightedIndex = 0;
			publish();
		},
		exit,
		highlight,
		handleKeyDown: (event) => {
			if (!activeMenu) {
				return false;
			}

			switch (event.key) {
				case 'ArrowDown':
					event.preventDefault();
					move(1);
					return true;
				case 'ArrowUp':
					event.preventDefault();
					move(-1);
					return true;
				case 'Enter':
				case 'Tab':
					event.preventDefault();
					commitHighlighted();
					return true;
				default:
					return false;
			}
		},
	};
}
