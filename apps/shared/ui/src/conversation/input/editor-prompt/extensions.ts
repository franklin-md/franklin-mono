import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { UndoRedo } from '@tiptap/extensions';

import { createMentionExtension } from './mention/extension.js';
import type { MenuController } from './mention/menu-controller.js';

interface CreatePromptEditorExtensionsOptions {
	readonly menuController: MenuController;
}

export function createPromptEditorExtensions({
	menuController,
}: CreatePromptEditorExtensionsOptions) {
	return [
		// Minimal schema plus editing behavior for a string-backed prompt:
		// paragraphs model newline-separated prompt text, hard breaks preserve
		// Shift+Enter line breaks, history keeps local undo/redo, and the mention
		// extension owns file-reference atoms and suggestion UI.
		Document,
		Paragraph,
		Text,
		HardBreak.configure({ keepMarks: false }),
		UndoRedo,

		createMentionExtension({
			menuController,
		}),
	];
}
