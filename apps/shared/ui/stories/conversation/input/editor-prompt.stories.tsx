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
	initialInput = '',
}: {
	readonly children: ReactNode;
	readonly initialInput?: string;
}) {
	const [input, setInput] = useState(initialInput);
	const [sendCount, setSendCount] = useState(0);
	const [firstSendCount, setFirstSendCount] = useState(0);
	const [secondSendCount, setSecondSendCount] = useState(0);
	const [sendMode, setSendMode] = useState<'first' | 'second'>('first');
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
				send: () => {
					setSendCount((count) => count + 1);
					if (sendMode === 'first') {
						setFirstSendCount((count) => count + 1);
					} else {
						setSecondSendCount((count) => count + 1);
					}
				},
				cancel: () => undefined,
			}}
		>
			<FileCollectionProvider collection={collection}>
				{children}
				<button
					type="button"
					onClick={() => setSendMode('second')}
					className="sr-only"
				>
					Switch send handler
				</button>
				<output data-testid="prompt-input">{input}</output>
				<output data-testid="send-count" hidden>
					{sendCount}
				</output>
				<output data-testid="send-mode" hidden>
					{sendMode}
				</output>
				<output data-testid="first-send-count" hidden>
					{firstSendCount}
				</output>
				<output data-testid="second-send-count" hidden>
					{secondSendCount}
				</output>
			</FileCollectionProvider>
		</PromptProvider>
	);
}

interface EditorPromptStoryProps {
	readonly initialInput?: string;
}

function EditorPromptStory({ initialInput }: EditorPromptStoryProps) {
	return (
		<EditorPromptStoryHarness initialInput={initialInput}>
			<div className="w-[560px]">
				<TextareaGroup textarea={<EditorPromptText />} buttonBar={<div />} />
			</div>
		</EditorPromptStoryHarness>
	);
}

const meta = {
	title: 'Conversation/Input/EditorPromptText',
	component: EditorPromptStory,
} satisfies Meta<typeof EditorPromptStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const StoredFileReference: Story = {
	args: { initialInput: 'Read @{notes/daily/2026-05-28.md}' },
	play: async ({ canvasElement }) => {
		await waitFor(async () => {
			await expect(
				canvasElement.querySelector(
					'[data-file-path="notes/daily/2026-05-28.md"]',
				),
			).not.toBeNull();
		});
	},
};

export const EnterSendsPrompt: Story = {
	args: { initialInput: 'hello' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const editor = canvas.getByLabelText('Message');

		await userEvent.click(editor);
		await userEvent.type(editor, '{enter}');

		await expect(canvas.getByTestId('send-count').textContent).toBe('1');
	},
};

export const LatestSendHandler: Story = {
	args: { initialInput: 'hello' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const editor = canvas.getByLabelText('Message');

		await userEvent.click(
			canvas.getByRole('button', { name: 'Switch send handler' }),
		);
		await waitFor(async () => {
			await expect(canvas.getByTestId('send-mode').textContent).toBe('second');
		});

		await userEvent.click(editor);
		await userEvent.type(editor, '{enter}');

		await expect(canvas.getByTestId('first-send-count').textContent).toBe('0');
		await expect(canvas.getByTestId('second-send-count').textContent).toBe('1');
	},
};

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
