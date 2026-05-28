// @vitest-environment jsdom

import { useState, type ReactNode } from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react';
import {
	FileCollectionProvider,
	FuseFileCollection,
	PromptProvider,
} from '@franklin/react';
import { describe, expect, it, vi } from 'vitest';

import { EditorPromptText } from '../../../../src/conversation/input/editor-prompt/editor.js';

function EditorPromptHarness({
	children,
	initialInput = '',
	send = vi.fn(),
	cancel = vi.fn(),
}: {
	readonly children: ReactNode;
	readonly initialInput?: string;
	readonly send?: () => void;
	readonly cancel?: () => void;
}) {
	const [input, setInput] = useState(initialInput);
	const [collection] = useState(
		() =>
			new FuseFileCollection([
				{ path: 'notes/deep work.md' },
				{ path: 'src/conversation/input/prompt-input.tsx' },
			]),
	);

	return (
		<PromptProvider
			value={{
				input,
				setInput,
				sending: false,
				canSend: input.trim().length > 0,
				send,
				cancel,
			}}
		>
			<FileCollectionProvider collection={collection}>
				{children}
				<output data-testid="prompt-value">{input}</output>
			</FileCollectionProvider>
		</PromptProvider>
	);
}

describe('EditorPromptText', () => {
	it('renders stored canonical file references as inline file nodes', async () => {
		const { container } = render(
			<EditorPromptHarness initialInput="Read @{notes/deep work.md}">
				<EditorPromptText />
			</EditorPromptHarness>,
		);

		await waitFor(() => {
			expect(
				container.querySelector('[data-file-path="notes/deep work.md"]'),
			).not.toBeNull();
		});
	});

	it('keeps Enter bound to prompt send', () => {
		const send = vi.fn();
		const { container } = render(
			<EditorPromptHarness initialInput="hello" send={send}>
				<EditorPromptText />
			</EditorPromptHarness>,
		);
		const editor = container.querySelector('[contenteditable="true"]');

		expect(editor).not.toBeNull();
		fireEvent.keyDown(editor as Element, { key: 'Enter', shiftKey: false });

		expect(send).toHaveBeenCalledTimes(1);
	});

	it('uses the latest prompt send handler after rerender', () => {
		const firstSend = vi.fn();
		const secondSend = vi.fn();
		const { container, rerender } = render(
			<EditorPromptHarness initialInput="hello" send={firstSend}>
				<EditorPromptText />
			</EditorPromptHarness>,
		);
		const editor = container.querySelector('[contenteditable="true"]');

		rerender(
			<EditorPromptHarness initialInput="hello" send={secondSend}>
				<EditorPromptText />
			</EditorPromptHarness>,
		);

		expect(editor).not.toBeNull();
		fireEvent.keyDown(editor as Element, { key: 'Enter', shiftKey: false });

		expect(firstSend).not.toHaveBeenCalled();
		expect(secondSend).toHaveBeenCalledTimes(1);
	});
});
