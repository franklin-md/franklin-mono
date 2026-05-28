import { useEffect, useMemo, useRef, useState } from 'react';

import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { EditorContent, useEditor } from '@tiptap/react';
import { UndoRedo } from '@tiptap/extensions';
import { useFileCollection, useFileSearch, usePrompt } from '@franklin/react';

import { cn } from '../../../lib/cn.js';

import { createFileMentionExtension } from './file-mention-extension.js';
import { FileMentionMenu } from './file-mention-menu.js';
import {
	createFileMentionMenuController,
	inactiveFileMentionSuggestion,
} from './file-mention-menu-controller.js';
import { createPromptDocument, getPromptText } from './prompt-document.js';

const editorClassName = cn(
	'min-h-12 max-h-60 overflow-y-auto bg-transparent px-4 pt-4 pb-0 text-sm leading-6 text-foreground outline-none',
	'whitespace-pre-wrap break-words focus-visible:outline-none',
	'[&_p]:m-0 [&_p]:min-h-6',
	'[&_.file-mention-node]:rounded-md [&_.file-mention-node]:bg-background/85 [&_.file-mention-node]:ring-1 [&_.file-mention-node]:ring-inset [&_.file-mention-node]:ring-ring/60',
);

const FILE_MENTION_LIMIT = 8;

export function TiptapPromptText() {
	const { input, setInput, send, cancel, sending } = usePrompt();
	const collection = useFileCollection();
	const [suggestion, setSuggestion] = useState(inactiveFileMentionSuggestion);
	const suggestionQuery = suggestion.active ? suggestion.query : '';
	const mentionItems = useFileSearch(collection, suggestionQuery, {
		limit: FILE_MENTION_LIMIT,
		debounceMs: 50,
	});
	const mentionItemsRef = useRef(mentionItems);
	const sendRef = useRef(send);
	const cancelRef = useRef(cancel);
	const sendingRef = useRef(sending);

	mentionItemsRef.current = mentionItems;
	sendRef.current = send;
	cancelRef.current = cancel;
	sendingRef.current = sending;

	const menuController = useMemo(
		() =>
			createFileMentionMenuController({
				getItems: () => mentionItemsRef.current,
				setSuggestionState: setSuggestion,
			}),
		[],
	);

	const extensions = useMemo(
		() => [
			Document,
			Paragraph,
			Text,
			HardBreak.configure({ keepMarks: false }),
			UndoRedo,
			createFileMentionExtension({
				menuController,
			}),
		],
		[menuController],
	);

	const editor = useEditor(
		{
			immediatelyRender: true,
			extensions,
			content: createPromptDocument(input),
			editorProps: {
				attributes: {
					'aria-label': 'Message',
					class: editorClassName,
				},
				handleKeyDown: (_view, event) => {
					if (event.key === 'Enter' && !event.shiftKey && !sendingRef.current) {
						event.preventDefault();
						sendRef.current();
						return true;
					}
					if (event.key === 'Escape' && sendingRef.current) {
						event.preventDefault();
						cancelRef.current();
						return true;
					}
					return false;
				},
			},
			onUpdate: ({ editor: updatedEditor }) => {
				setInput(getPromptText(updatedEditor));
			},
		},
		[extensions],
	);

	useEffect(() => {
		const currentText = getPromptText(editor);
		if (currentText === input) {
			return;
		}

		editor.commands.setContent(createPromptDocument(input), {
			emitUpdate: false,
		});
	}, [editor, input]);

	return (
		<div className="relative flex-1">
			{input.length === 0 ? (
				<div className="pointer-events-none absolute left-4 top-4 text-sm leading-6 text-muted-foreground">
					Type a message...
				</div>
			) : null}
			<EditorContent editor={editor} />
			<FileMentionMenu
				suggestion={suggestion}
				items={mentionItems}
				onHighlight={menuController.highlight}
			/>
		</div>
	);
}
