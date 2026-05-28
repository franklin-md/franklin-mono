import { describe, expect, it, vi } from 'vitest';

import {
	createMenuController,
	type ActiveMentionSuggestionState,
	type MentionSuggestionState,
	inactiveMentionSuggestion,
} from '../../../../../src/conversation/input/editor-prompt/mention/menu-controller.js';

type TestItem = {
	readonly path: string;
};

function createKeyEvent(key: string) {
	return {
		key,
		preventDefault: vi.fn(),
	};
}

function createAnchorRect(): DOMRect {
	return {
		x: 10,
		y: 20,
		width: 0,
		height: 8,
		top: 20,
		right: 10,
		bottom: 28,
		left: 10,
		toJSON: () => ({}),
	} as DOMRect;
}

function createHarness(initialItems: readonly TestItem[] = createItems()) {
	let items = initialItems;
	let suggestion: MentionSuggestionState = inactiveMentionSuggestion;
	const anchorRect = createAnchorRect();
	const suggestionStates: MentionSuggestionState[] = [];
	const command = vi.fn();
	const controller = createMenuController({
		getItems: () => items,
		setSuggestionState: (next) => {
			suggestion = typeof next === 'function' ? next(suggestion) : next;
			suggestionStates.push(suggestion);
		},
	});

	function show(query = 'a') {
		controller.show({
			query,
			anchorRect,
			command,
		});
	}

	return {
		command,
		anchorRect,
		controller,
		get suggestion() {
			return suggestion;
		},
		suggestionStates,
		setItems: (nextItems: readonly TestItem[]) => {
			items = nextItems;
		},
		show,
	};
}

function createItems(): readonly TestItem[] {
	return [{ path: 'alpha.md' }, { path: 'beta.md' }];
}

function expectActiveSuggestion(
	suggestion: MentionSuggestionState,
): asserts suggestion is ActiveMentionSuggestionState {
	expect(suggestion.active).toBe(true);
}

describe('createMenuController', () => {
	it('starts with the first item highlighted when shown', () => {
		const harness = createHarness();

		harness.show();

		expectActiveSuggestion(harness.suggestion);
		expect(harness.suggestion.highlightedIndex).toBe(0);
	});

	it('resets to the first item when the query changes', () => {
		const harness = createHarness();

		harness.show();
		harness.controller.highlight(1);
		harness.show('b');

		expectActiveSuggestion(harness.suggestion);
		expect(harness.suggestion.query).toBe('b');
		expect(harness.suggestion.anchorRect).toBe(harness.anchorRect);
		expect(harness.suggestion.highlightedIndex).toBe(0);
	});

	it('wraps ArrowDown and ArrowUp through the item list', () => {
		const harness = createHarness();
		const down = createKeyEvent('ArrowDown');
		const up = createKeyEvent('ArrowUp');

		harness.show();
		harness.controller.handleKeyDown(up);
		expect(up.preventDefault).toHaveBeenCalledTimes(1);
		expectActiveSuggestion(harness.suggestion);
		expect(harness.suggestion.highlightedIndex).toBe(1);

		harness.controller.handleKeyDown(down);
		expect(down.preventDefault).toHaveBeenCalledTimes(1);
		expectActiveSuggestion(harness.suggestion);
		expect(harness.suggestion.highlightedIndex).toBe(0);
	});

	it('commits the highlighted item with Enter or Tab', () => {
		const harness = createHarness();
		const enter = createKeyEvent('Enter');
		const tab = createKeyEvent('Tab');

		harness.show();
		harness.controller.highlight(1);
		harness.controller.handleKeyDown(enter);
		expect(enter.preventDefault).toHaveBeenCalledTimes(1);
		expect(harness.command).toHaveBeenCalledWith({ path: 'beta.md' });

		harness.show();
		harness.controller.highlight(0);
		harness.controller.handleKeyDown(tab);
		expect(tab.preventDefault).toHaveBeenCalledTimes(1);
		expect(harness.command).toHaveBeenLastCalledWith({ path: 'alpha.md' });
	});

	it('publishes a command that commits an item and exits', () => {
		const harness = createHarness();

		harness.show();
		expectActiveSuggestion(harness.suggestion);
		harness.suggestion.command({ path: 'alpha.md' });

		expect(harness.command).toHaveBeenCalledWith({ path: 'alpha.md' });
		expect(harness.suggestion).toEqual(inactiveMentionSuggestion);
	});

	it('consumes Enter and Tab while active even when there are no items', () => {
		const harness = createHarness([]);
		const enter = createKeyEvent('Enter');
		const tab = createKeyEvent('Tab');

		harness.show();

		expect(harness.controller.handleKeyDown(enter)).toBe(true);
		expect(harness.controller.handleKeyDown(tab)).toBe(true);
		expect(enter.preventDefault).toHaveBeenCalledTimes(1);
		expect(tab.preventDefault).toHaveBeenCalledTimes(1);
		expect(harness.command).not.toHaveBeenCalled();
	});

	it('keeps the stable keydown handler pointed at the latest items', () => {
		const harness = createHarness();
		const handleKeyDown = harness.controller.handleKeyDown;

		harness.show();
		harness.setItems([{ path: 'latest.md' }]);
		handleKeyDown(createKeyEvent('Enter'));

		expect(harness.command).toHaveBeenCalledWith({ path: 'latest.md' });
	});

	it('ignores handled menu keys when inactive', () => {
		const harness = createHarness();
		const enter = createKeyEvent('Enter');

		expect(harness.controller.handleKeyDown(enter)).toBe(false);
		expect(enter.preventDefault).not.toHaveBeenCalled();
		expect(harness.command).not.toHaveBeenCalled();
	});
});
