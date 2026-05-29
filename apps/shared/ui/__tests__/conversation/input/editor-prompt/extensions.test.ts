// @vitest-environment jsdom

import { Editor } from '@tiptap/core';
import { describe, expect, it, vi } from 'vitest';

import { createPromptEditorExtensions } from '../../../../src/conversation/input/editor-prompt/extensions.js';
import { handlePromptEditorKeyDown } from '../../../../src/conversation/input/editor-prompt/key-down.js';
import { createMenuController } from '../../../../src/conversation/input/editor-prompt/mention/menu-controller.js';

describe('createPromptEditorExtensions', () => {
	it('lets the mention menu consume Enter before the prompt send handler', () => {
		const element = document.createElement('div');
		const send = vi.fn();
		const commitMention = vi.fn();
		const menuController = createMenuController({
			getItems: () => [{ path: 'notes/deep work.md' }],
			setSuggestionState: vi.fn(),
		});
		const editor = new Editor({
			element,
			extensions: createPromptEditorExtensions({ menuController }),
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: '@deep' }],
					},
				],
			},
			editorProps: {
				handleKeyDown: (_view, event) =>
					handlePromptEditorKeyDown({
						menuController,
						event,
						sending: false,
						send,
						cancel: vi.fn(),
					}),
			},
		});

		try {
			document.body.append(element);
			menuController.show({
				query: 'deep',
				anchorRect: undefined,
				command: commitMention,
			});

			const event = new KeyboardEvent('keydown', {
				key: 'Enter',
				bubbles: true,
				cancelable: true,
			});
			editor.view.dom.dispatchEvent(event);

			expect(send).not.toHaveBeenCalled();
			expect(commitMention).toHaveBeenCalledWith({
				path: 'notes/deep work.md',
			});
			expect(event.defaultPrevented).toBe(true);
		} finally {
			editor.destroy();
			element.remove();
		}
	});
});
