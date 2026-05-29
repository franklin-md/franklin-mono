import { useState } from 'react';

import type { FileIndexItem } from '@franklin/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { MentionMenu } from '../../../src/conversation/input/editor-prompt/mention/menu.js';
import {
	inactiveMentionSuggestion,
	type MentionSuggestionState,
} from '../../../src/conversation/input/editor-prompt/mention/menu-controller.js';

const items: FileIndexItem[] = [
	{ path: 'notes/alpha.md', metadata: undefined },
	{ path: 'notes/beta.md', metadata: undefined },
];

function createAnchorRect(): DOMRect {
	return {
		x: 24,
		y: 72,
		width: 0,
		height: 8,
		top: 72,
		right: 24,
		bottom: 80,
		left: 24,
		toJSON: () => ({}),
	} as DOMRect;
}

interface MentionMenuStoryProps {
	readonly empty?: boolean;
	readonly initiallyOpen?: boolean;
}

function MentionMenuStory({
	empty = false,
	initiallyOpen = true,
}: MentionMenuStoryProps) {
	const [open, setOpen] = useState(initiallyOpen);
	const [highlightedIndex, setHighlightedIndex] = useState(0);
	const [committedPath, setCommittedPath] = useState('');
	const menuItems = empty ? [] : items;
	const suggestion: MentionSuggestionState = open
		? {
				active: true,
				query: 'does-not-filter-locally',
				anchorRect: createAnchorRect(),
				highlightedIndex,
				command: (item) => setCommittedPath(item.path),
			}
		: inactiveMentionSuggestion;

	return (
		<div className="flex min-h-56 w-[420px] flex-col gap-3 p-4">
			<div
				contentEditable
				data-testid="mention-editor"
				tabIndex={0}
				className="min-h-16 rounded-md bg-background px-3 py-2 text-sm ring-1 ring-inset ring-border outline-none focus-visible:ring-ring"
			/>
			<button
				type="button"
				onMouseDown={(event) => event.preventDefault()}
				onClick={() => setOpen(true)}
				className="w-fit rounded-md px-2 py-1 text-xs ring-1 ring-inset ring-border"
			>
				Open menu
			</button>
			<MentionMenu
				suggestion={suggestion}
				items={menuItems}
				onHighlight={setHighlightedIndex}
			/>
			<output data-testid="committed-path" hidden>
				{committedPath}
			</output>
		</div>
	);
}

const meta = {
	title: 'Conversation/Input/MentionMenu',
	component: MentionMenuStory,
} satisfies Meta<typeof MentionMenuStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement }) => {
		const documentBody = within(canvasElement.ownerDocument.body);

		await documentBody.findByRole('option', { name: /alpha\.md/ });
		await expect(
			documentBody.getByRole('option', { name: /beta\.md/ }),
		).toBeTruthy();
	},
};

export const FocusRetention: Story = {
	args: { initiallyOpen: false },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const documentBody = within(canvasElement.ownerDocument.body);
		const editor = canvas.getByTestId('mention-editor');

		await userEvent.click(editor);
		await expect(canvasElement.ownerDocument.activeElement).toBe(editor);

		await userEvent.click(canvas.getByRole('button', { name: 'Open menu' }));
		await documentBody.findByRole('option', { name: /alpha\.md/ });

		await expect(canvasElement.ownerDocument.activeElement).toBe(editor);
	},
};

export const EmptyState: Story = {
	args: { empty: true },
	play: async ({ canvasElement }) => {
		const documentBody = within(canvasElement.ownerDocument.body);

		await expect(await documentBody.findByText('No files found')).toBeTruthy();
	},
};

export const CommitSelectedItem: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const documentBody = within(canvasElement.ownerDocument.body);

		await userEvent.click(
			await documentBody.findByRole('option', { name: /alpha\.md/ }),
		);

		await waitFor(async () => {
			await expect(canvas.getByTestId('committed-path').textContent).toBe(
				'notes/alpha.md',
			);
		});
	},
};
