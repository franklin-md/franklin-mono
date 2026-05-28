import type { Dispatch, SetStateAction } from 'react';
import type { FileReferenceItem } from '@franklin/react';

export type FileMentionSuggestionState =
	| { readonly active: false }
	| {
			readonly active: true;
			readonly query: string;
			readonly clientRect: (() => DOMRect | null) | null | undefined;
			readonly highlightedIndex: number;
			readonly command: (item: FileReferenceItem) => void;
	  };

export const inactiveFileMentionSuggestion: FileMentionSuggestionState = {
	active: false,
};

export interface FileMentionMenuKeyEvent {
	readonly key: string;
	preventDefault(): void;
}

interface ActiveFileMentionMenu {
	readonly query: string;
	readonly clientRect: (() => DOMRect | null) | null | undefined;
	readonly command: (item: FileReferenceItem) => void;
}

type ShowFileMentionMenuOptions = ActiveFileMentionMenu;

interface CreateFileMentionMenuControllerOptions {
	readonly getItems: () => readonly FileReferenceItem[];
	readonly setSuggestionState: Dispatch<
		SetStateAction<FileMentionSuggestionState>
	>;
}

export interface FileMentionMenuController {
	readonly show: (options: ShowFileMentionMenuOptions) => void;
	readonly exit: () => void;
	readonly highlight: (index: number) => void;
	readonly handleKeyDown: (event: FileMentionMenuKeyEvent) => boolean;
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

export function createFileMentionMenuController({
	getItems,
	setSuggestionState,
}: CreateFileMentionMenuControllerOptions): FileMentionMenuController {
	let activeMenu: ActiveFileMentionMenu | undefined;
	let highlightedIndex = 0;

	const publish = () => {
		if (!activeMenu) {
			setSuggestionState(inactiveFileMentionSuggestion);
			return;
		}

		setSuggestionState({
			active: true,
			query: activeMenu.query,
			clientRect: activeMenu.clientRect,
			highlightedIndex,
			command: commitItem,
		});
	};

	const exit = () => {
		activeMenu = undefined;
		highlightedIndex = 0;
		setSuggestionState(inactiveFileMentionSuggestion);
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
