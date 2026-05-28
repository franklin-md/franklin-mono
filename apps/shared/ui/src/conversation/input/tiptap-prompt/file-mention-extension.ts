import { type Editor, mergeAttributes, type Range } from '@tiptap/core';
import { Mention, type MentionNodeAttrs } from '@tiptap/extension-mention';
import { PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { SuggestionProps } from '@tiptap/suggestion';

import {
	createFileMentionAttrs,
	createFileMentionNodeContent,
	FILE_MENTION_TRIGGER,
	getFileMentionPath,
} from './file-mention-node.js';
import { FileMentionNodeView } from './node-view.js';
import { formatFileReferenceToken } from './file-reference-token.js';
import type { FileMentionMenuController } from './file-mention-menu-controller.js';

const fileMentionPluginKey = new PluginKey('file-mention');

type FileMentionSuggestionProps = SuggestionProps<unknown, MentionNodeAttrs>;

interface CreateFileMentionExtensionOptions {
	readonly menuController: FileMentionMenuController;
}

function replaceSuggestionWithFileMention(
	editor: Editor,
	range: Range,
	attrs: MentionNodeAttrs,
): void {
	const path = getFileMentionPath(attrs);

	editor
		.chain()
		.focus()
		.insertContentAt(range, [
			createFileMentionNodeContent({ path }),
			{ type: 'text', text: ' ' },
		])
		.run();
}

function showSuggestionMenu(
	props: FileMentionSuggestionProps,
	options: CreateFileMentionExtensionOptions,
): void {
	options.menuController.show({
		query: props.query,
		clientRect: props.clientRect,
		command: (item) => props.command(createFileMentionAttrs(item)),
	});
}

const FileMention = Mention.extend({
	addNodeView() {
		return ReactNodeViewRenderer(FileMentionNodeView);
	},
});

export function createFileMentionExtension(
	options: CreateFileMentionExtensionOptions,
) {
	return FileMention.configure({
		HTMLAttributes: {
			class: 'file-mention-node',
		},
		deleteTriggerWithBackspace: true,
		renderText: ({ node }) => {
			const path = getFileMentionPath(node.attrs);
			return path.length > 0 ? formatFileReferenceToken(path) : '';
		},
		renderHTML: ({ options: renderOptions, node }) => [
			'span',
			mergeAttributes(renderOptions.HTMLAttributes, {
				'data-file-path': getFileMentionPath(node.attrs),
			}),
			getFileMentionPath(node.attrs),
		],
		suggestion: {
			pluginKey: fileMentionPluginKey,
			char: FILE_MENTION_TRIGGER,
			allowSpaces: true,
			allowedPrefixes: [' ', '\n'],
			command: ({ editor, range, props }) => {
				replaceSuggestionWithFileMention(editor, range, props);
			},
			render: () => {
				return {
					onStart: (props) => {
						showSuggestionMenu(props, options);
					},
					onUpdate: (props) => {
						showSuggestionMenu(props, options);
					},
					onExit: () => {
						options.menuController.exit();
					},
					onKeyDown: ({ event }) => options.menuController.handleKeyDown(event),
				};
			},
		},
	});
}
