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
				class: 'm-0 min-h-6',
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
