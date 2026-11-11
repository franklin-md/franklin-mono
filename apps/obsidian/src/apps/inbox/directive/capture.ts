import type { Editor, MarkdownFileInfo } from 'obsidian';
import type { DirectiveDefinition } from '../../../shared/directives/types.js';
import { captureDirectiveTarget } from '../../../shared/directives/scribe/target.js';
import { stripDirectives } from '../../../shared/directives/syntax/strip.js';
import type { InboxController } from '../controller/controller.js';
import { captureSelection } from '../host/capture.js';
import { InboxSelection } from './selection.js';
import type { InboxQuestionDirectiveState } from './types.js';

type Options = {
	editor: Editor;
	view: MarkdownFileInfo;
	inbox: InboxController;
	definition: DirectiveDefinition<InboxQuestionDirectiveState>;
};

export function captureInboxSelection({ editor, view, inbox, definition }: Options): InboxSelection | undefined {
	const source = captureSelection({ editor, view });
	if (!source?.location) return;
	const quote = stripDirectives(source.quote).trim();
	if (!quote) return;
	const end = source.location.to;
	// A selection ending at the next line's column zero belongs to the preceding line.
	const line = end.line > source.location.from.line && end.ch === 0 ? end.line - 1 : end.line;
	return new InboxSelection({
		inbox, definition,
		target: captureDirectiveTarget(editor, view, line),
		source: { ...source, quote, location: { ...source.location, context: stripDirectives(source.location.context) } },
	});
}
