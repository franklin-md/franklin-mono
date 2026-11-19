import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Placeholder, UndoRedo } from '@tiptap/extensions';

import { createMentionExtension } from './mention/extension.js';
import type { MenuController } from './mention/menu-controller.js';

interface CreatePromptEditorExtensionsOptions {
	readonly menuController: MenuController;
}

export function createPromptEditorExtensions({
	menuController,
}: CreatePromptEditorExtensionsOptions) {
	return [
		Document,
		Paragraph.configure({
			HTMLAttributes: {
				// Radix ScrollArea sizes its content as a table, so long unbroken
				// tokens widen the whole editor unless they can wrap at min-content
				// size. TipTap's unlayered `.ProseMirror { word-wrap: break-word }`
				// cannot, and it outranks a Tailwind utility on the editor root.
				class: 'm-0 min-h-6 wrap-anywhere',
			},
		}),
		Text,
		Placeholder.configure({
			placeholder: 'Ask to research or edit notes, @mention files...',
		}),
		// Shift + Enter does not submit/send
		HardBreak.configure({ keepMarks: false }),
		UndoRedo,

		createMentionExtension({
			menuController,
		}),
	];
}
