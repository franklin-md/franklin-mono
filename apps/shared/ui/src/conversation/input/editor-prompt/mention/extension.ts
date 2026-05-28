import type { Editor, Range } from '@tiptap/core';
import { Mention, type MentionNodeAttrs } from '@tiptap/extension-mention';
import { PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { SuggestionProps } from '@tiptap/suggestion';

import {
	createMentionAttrs,
	createMentionNodeContent,
	MENTION_TRIGGER,
	getMentionPath,
} from './node.js';
import { MentionNodeView } from './node-view.js';
import { formatReferenceToken } from './reference-token.js';
import type { MenuController } from './menu-controller.js';

const mentionPluginKey = new PluginKey('editor-prompt-mention');

type MentionSuggestionProps = SuggestionProps<unknown, MentionNodeAttrs>;

interface CreateMentionExtensionOptions {
	readonly menuController: MenuController;
}

function replaceSuggestionWithMention(
	editor: Editor,
	range: Range,
	attrs: MentionNodeAttrs,
): void {
	const path = getMentionPath(attrs);

	editor
		.chain()
		.focus()
		.insertContentAt(range, [
			createMentionNodeContent({ path }),
			{ type: 'text', text: ' ' },
		])
		.run();
}

function showSuggestionMenu(
	props: MentionSuggestionProps,
	options: CreateMentionExtensionOptions,
): void {
	options.menuController.show({
		query: props.query,
		clientRect: props.clientRect,
		command: (item) => props.command(createMentionAttrs(item)),
	});
}

const MentionExtension = Mention.extend({
	addNodeView() {
		return ReactNodeViewRenderer(MentionNodeView);
	},
});

export function createMentionExtension(options: CreateMentionExtensionOptions) {
	return MentionExtension.configure({
		HTMLAttributes: {
			class: 'mention-node',
		},
		deleteTriggerWithBackspace: true,
		renderText: ({ node }) => {
			const path = getMentionPath(node.attrs);
			return path.length > 0 ? formatReferenceToken(path) : '';
		},
		suggestion: {
			pluginKey: mentionPluginKey,
			char: MENTION_TRIGGER,
			allowSpaces: true,
			allowedPrefixes: [' ', '\n'],
			command: ({ editor, range, props }) => {
				replaceSuggestionWithMention(editor, range, props);
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
