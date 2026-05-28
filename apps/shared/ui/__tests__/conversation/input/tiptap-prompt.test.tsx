// @vitest-environment jsdom

import { useState, type ReactNode } from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import { Mention } from '@tiptap/extension-mention';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import {
	FileCollectionProvider,
	FuseFileCollection,
	PromptProvider,
} from '@franklin/react';
import { describe, expect, it, vi } from 'vitest';

import { TiptapPromptText } from '../../../src/conversation/input/tiptap-prompt/editor.js';
import {
	createFileMentionAttrs,
	createFileMentionNodeContent,
	getFileMentionPath,
} from '../../../src/conversation/input/tiptap-prompt/file-mention-node.js';
import { getFileMentionMenuStyle } from '../../../src/conversation/input/tiptap-prompt/file-mention-menu.js';
import {
	createPromptDocument,
	getPromptText,
} from '../../../src/conversation/input/tiptap-prompt/prompt-document.js';

import {
	findFileReferenceTokens,
	formatFileReferenceToken,
} from '../../../src/conversation/input/tiptap-prompt/file-reference-token.js';

describe('file reference tokens', () => {
	it('formats and finds canonical file reference tokens', () => {
		expect(formatFileReferenceToken('notes/deep work.md')).toBe(
			'@{notes/deep work.md}',
		);
		expect(findFileReferenceTokens('Read @{notes/deep work.md} next')).toEqual([
			{
				index: 5,
				text: '@{notes/deep work.md}',
				path: 'notes/deep work.md',
			},
		]);
	});
});

describe('file mention node helpers', () => {
	it('builds attrs and node content from one factory path', () => {
		const item = { path: 'notes/deep work.md' };
		const attrs = createFileMentionAttrs(item);

		expect(attrs).toEqual({
			id: 'notes/deep work.md',
			label: 'notes/deep work.md',
			mentionSuggestionChar: '@',
		});
		expect(createFileMentionNodeContent(item)).toEqual({
			type: 'mention',
			attrs,
		});
		expect(getFileMentionPath(attrs)).toBe('notes/deep work.md');
	});
});

describe('createPromptDocument', () => {
	it('parses canonical file reference tokens into mention nodes', () => {
		expect(createPromptDocument('Read @{notes/deep work.md}\nthen respond'))
			.toMatchInlineSnapshot(`
				{
				  "content": [
				    {
				      "content": [
				        {
				          "text": "Read ",
				          "type": "text",
				        },
				        {
				          "attrs": {
				            "id": "notes/deep work.md",
				            "label": "notes/deep work.md",
				            "mentionSuggestionChar": "@",
				          },
				          "type": "mention",
				        },
				      ],
				      "type": "paragraph",
				    },
				    {
				      "content": [
				        {
				          "text": "then respond",
				          "type": "text",
				        },
				      ],
				      "type": "paragraph",
				    },
				  ],
				  "type": "doc",
				}
			`);
	});
});

describe('getPromptText', () => {
	it('serializes mention nodes back to canonical file reference tokens', () => {
		const editor = new Editor({
			extensions: [Document, Paragraph, Text, Mention],
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'Read ' },
							createFileMentionNodeContent({ path: 'notes/deep work.md' }),
						],
					},
				],
			},
		});

		try {
			expect(getPromptText(editor)).toBe('Read @{notes/deep work.md}');
		} finally {
			editor.destroy();
		}
	});
});

function TiptapPromptHarness({
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

describe('TiptapPromptText', () => {
	it('renders stored canonical file references as inline file nodes', async () => {
		const { container } = render(
			<TiptapPromptHarness initialInput="Read @{notes/deep work.md}">
				<TiptapPromptText />
			</TiptapPromptHarness>,
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
			<TiptapPromptHarness initialInput="hello" send={send}>
				<TiptapPromptText />
			</TiptapPromptHarness>,
		);
		const editor = container.querySelector('[contenteditable="true"]');

		expect(editor).not.toBeNull();
		fireEvent.keyDown(editor as Element, { key: 'Enter', shiftKey: false });

		expect(send).toHaveBeenCalledTimes(1);
	});
});

describe('getFileMentionMenuStyle', () => {
	it('keeps the anchored menu inside the viewport gutter', () => {
		const style = getFileMentionMenuStyle(new DOMRect(790, 20, 0, 20), 800);

		expect(style).toMatchObject({
			position: 'fixed',
			top: 46,
			left: 472,
			width: 320,
		});
	});
});
