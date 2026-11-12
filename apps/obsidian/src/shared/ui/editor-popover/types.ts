import type { ReactNode } from 'react';
import type { App, Editor, MarkdownFileInfo } from 'obsidian';
import type { FloatingAnchor } from '@franklin/ui';

export type EditorPopoverSession = {
	anchor: FloatingAnchor;
	focus: () => void;
	close: (restoreFocus: boolean) => void;
	contentRef: (element: HTMLDivElement | null) => void;
};

export type EditorPopoverOptions = {
	app: App;
	editor: Editor;
	info: MarkdownFileInfo;
	validate: () => void;
	onClose: () => void;
	render: (session: EditorPopoverSession) => ReactNode;
};
