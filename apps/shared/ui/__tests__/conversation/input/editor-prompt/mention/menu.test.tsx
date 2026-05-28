// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from 'vitest';

import { MentionMenu } from '../../../../../src/conversation/input/editor-prompt/mention/menu.js';
import {
	type MentionSuggestionState,
	inactiveMentionSuggestion,
} from '../../../../../src/conversation/input/editor-prompt/mention/menu-controller.js';

const items = [{ path: 'notes/alpha.md' }, { path: 'notes/beta.md' }];

type TestItem = (typeof items)[number];

function createAnchorRect(): DOMRect {
	return {
		x: 24,
		y: 48,
		width: 0,
		height: 8,
		top: 48,
		right: 24,
		bottom: 56,
		left: 24,
		toJSON: () => ({}),
	} as DOMRect;
}

class TestResizeObserver {
	readonly observe = vi.fn();
	readonly unobserve = vi.fn();
	readonly disconnect = vi.fn();
}

beforeAll(() => {
	vi.stubGlobal('ResizeObserver', TestResizeObserver);
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
		configurable: true,
		value: vi.fn(),
	});
});

afterAll(() => {
	vi.unstubAllGlobals();
});

afterEach(cleanup);

function createSuggestion(
	overrides: Partial<Extract<MentionSuggestionState, { active: true }>> = {},
): MentionSuggestionState {
	return {
		active: true,
		query: 'does-not-filter-locally',
		anchorRect: createAnchorRect(),
		highlightedIndex: 0,
		command: vi.fn(),
		...overrides,
	};
}

interface MenuHarnessProps {
	readonly suggestion: MentionSuggestionState;
	readonly items?: readonly TestItem[];
	readonly onHighlight: (index: number) => void;
}

function MenuHarness({
	suggestion,
	items: menuItems = items,
	onHighlight,
}: MenuHarnessProps) {
	return (
		<>
			<div contentEditable data-testid="editor" tabIndex={0} />
			<MentionMenu
				suggestion={suggestion}
				items={menuItems}
				onHighlight={onHighlight}
			/>
		</>
	);
}

function renderMenu(suggestion: MentionSuggestionState) {
	return render(<MenuHarness suggestion={suggestion} onHighlight={vi.fn()} />);
}

describe('MentionMenu', () => {
	it('keeps editor focus when the menu opens', async () => {
		const onHighlight = vi.fn();
		const { rerender } = render(
			<MenuHarness
				suggestion={inactiveMentionSuggestion}
				onHighlight={onHighlight}
			/>,
		);
		const editor = screen.getByTestId('editor');

		editor.focus();
		expect(document.activeElement).toBe(editor);

		rerender(
			<MenuHarness suggestion={createSuggestion()} onHighlight={onHighlight} />,
		);

		await waitFor(() => expect(screen.getByText('alpha.md')).toBeTruthy());
		expect(document.activeElement).toBe(editor);
	});

	it('renders externally filtered items through Command without local filtering', async () => {
		renderMenu(createSuggestion());

		await waitFor(() => expect(screen.getByText('alpha.md')).toBeTruthy());
		expect(screen.getByText('beta.md')).toBeTruthy();
	});

	it('renders the empty state when no filtered items are available', async () => {
		render(
			<MenuHarness
				suggestion={createSuggestion()}
				items={[]}
				onHighlight={vi.fn()}
			/>,
		);

		expect(await screen.findByText('No files found')).toBeTruthy();
	});

	it('commits the selected item through the active suggestion command', async () => {
		const command = vi.fn();
		renderMenu(createSuggestion({ command }));

		fireEvent.click(await screen.findByRole('option', { name: /alpha\.md/ }));

		expect(command).toHaveBeenCalledWith(items[0]);
	});
});
