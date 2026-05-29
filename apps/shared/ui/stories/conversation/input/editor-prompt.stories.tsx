import { useMemo, useState, type ReactNode } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	FileCollectionProvider,
	FuseFileCollection,
	PromptProvider,
} from '@franklin/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { TextareaGroup } from '../../../src/components/textarea-group.js';
import { EditorPromptText } from '../../../src/conversation/input/editor-prompt/editor.js';

function EditorPromptStoryHarness({
	children,
}: {
	readonly children: ReactNode;
}) {
	const [input, setInput] = useState('');
	const [sendCount, setSendCount] = useState(0);
	const collection = useMemo(
		() =>
			new FuseFileCollection([
				{ path: 'notes/daily/2026-05-28.md' },
				{ path: 'notes/research/headless-mentions.md' },
				{ path: 'apps/shared/ui/src/conversation/input/prompt-input.tsx' },
				{ path: 'packages/ui/react/src/file-search/fuse-file-collection.ts' },
			]),
		[],
	);

	return (
		<PromptProvider
			value={{
				input,
				setInput,
				sending: false,
				canSend: input.trim().length > 0,
				send: () => setSendCount((count) => count + 1),
				cancel: () => undefined,
			}}
		>
			<FileCollectionProvider collection={collection}>
				{children}
				<output data-testid="prompt-input">{input}</output>
				<output data-testid="send-count" hidden>
					{sendCount}
				</output>
			</FileCollectionProvider>
		</PromptProvider>
	);
}

const meta = {
	title: 'Conversation/Input/EditorPromptText',
	component: EditorPromptText,
	decorators: [
		(Story) => (
			<EditorPromptStoryHarness>
				<div className="w-[560px]">
					<TextareaGroup textarea={<Story />} buttonBar={<div />} />
				</div>
			</EditorPromptStoryHarness>
		),
	],
} satisfies Meta<typeof EditorPromptText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const MentionMenuEnterCommit: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const documentBody = within(canvasElement.ownerDocument.body);
		const editor = canvas.getByLabelText('Message');

		await userEvent.click(editor);
		await userEvent.type(editor, '@');
		await documentBody.findByRole('option', { name: /2026-05-28\.md/ });
		await userEvent.type(editor, '{enter}');

		await waitFor(async () => {
			await expect(
				canvasElement.querySelector(
					'[data-file-path="notes/daily/2026-05-28.md"]',
				),
			).not.toBeNull();
		});
		await expect(canvas.getByTestId('send-count').textContent).toBe('0');
	},
};
