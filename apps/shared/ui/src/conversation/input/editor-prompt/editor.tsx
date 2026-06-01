import { useEffect, useMemo, useRef, useState } from 'react';

import { EditorContent, useEditor } from '@tiptap/react';
import { usePrompt } from '@franklin/react';

import { cn } from '../../../lib/cn.js';
import {
	ScrollBar,
	ScrollCorner,
	ScrollRoot,
	ScrollViewport,
} from '../../../primitives/scroll-area.js';
import { textInputSurfaceClassName } from '../../../primitives/textarea.js';

import { createPromptEditorExtensions } from './extensions.js';
import { handlePromptEditorKeyDown } from './key-down.js';
import { MentionMenu } from './mention/menu.js';
import {
	createMenuController,
	inactiveMentionSuggestion,
} from './mention/menu-controller.js';
import { useMentionItems } from './mention/search.js';
import { createPromptDocument, getPromptText } from './prompt-document.js';

const editorClassName = cn(
	textInputSurfaceClassName,
	'min-h-12 px-4 pt-2 pb-0 leading-6 outline-none',
	// TipTap's Placeholder extension provides classes/data attributes, but
	// still requires CSS to render the placeholder text.
	'[&_.is-editor-empty:first-child::before]:pointer-events-none',
	'[&_.is-editor-empty:first-child::before]:float-left',
	'[&_.is-editor-empty:first-child::before]:h-0',
	'[&_.is-editor-empty:first-child::before]:text-muted-foreground',
	'[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
);

export function PromptEditor() {
	const { input, setInput, send, cancel, sending } = usePrompt();
	const [suggestion, setSuggestion] = useState(inactiveMentionSuggestion);
	const mentionItems = useMentionItems(suggestion);
	const mentionItemsRef = useRef(mentionItems);
	const initialContentRef = useRef(createPromptDocument(input));

	mentionItemsRef.current = mentionItems;

	const menuController = useMemo(
		() =>
			createMenuController({
				getItems: () => mentionItemsRef.current,
				setSuggestionState: setSuggestion,
			}),
		[],
	);

	const extensions = useMemo(
		() => createPromptEditorExtensions({ menuController }),
		[menuController],
	);

	const editorProps = useMemo(
		() => ({
			attributes: {
				'aria-label': 'Message',
				class: editorClassName,
			},
			handleKeyDown: (_view: unknown, event: KeyboardEvent) =>
				handlePromptEditorKeyDown({
					menuController,
					event,
					sending,
					send,
					cancel,
				}),
		}),
		[cancel, menuController, send, sending],
	);

	const editor = useEditor(
		{
			immediatelyRender: true,
			extensions,
			content: initialContentRef.current,
			editorProps,
			onUpdate: ({ editor: updatedEditor }) => {
				setInput(getPromptText(updatedEditor));
			},
		},
		[],
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
			<ScrollRoot className="min-h-12 max-h-60 w-full rounded-[inherit]">
				<ScrollViewport className="h-auto max-h-60">
					<div className="w-full pr-4">
						<EditorContent editor={editor} />
					</div>
				</ScrollViewport>
				<ScrollBar />
				<ScrollCorner />
			</ScrollRoot>
			<MentionMenu
				suggestion={suggestion}
				items={mentionItems}
				onHighlight={menuController.highlight}
			/>
		</div>
	);
}
