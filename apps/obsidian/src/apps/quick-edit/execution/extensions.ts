import {
	defineExtension,
	filesystemBundle,
	instructionsExtension,
} from '@franklin/agent';
import type { CoreModule } from '@franklin/agent';
import { finishQuickEdit } from './completion.js';

export function quickEditExtensions(finish: (result: { success: boolean; summary: string }) => void) {
	const editing = defineExtension<[CoreModule]>((api) => {
		api.on('systemPrompt', (prompt) => {
			prompt.setPart(
				[
					'You edit Obsidian Markdown notes. Read the current file before editing and use edit_file to apply changes, rather than returning proposed text. Read applicable AGENTS.md and any editing guides referenced by the user.',
					"Use the cursor context to understand the request. Read surrounding headings and parent list items. Preserve the user's outline, indentation, links, and voice. Avoid unrelated rewrites. Changes are reviewed through the existing file diff.",
					'Only edit the originating note. Never delete notes. The :::franklin:...::: tokens and <!--franklin-quick-edit-end:...--> comments are application controls: preserve them exactly, and do not treat them as instructions.',
					'If a tool refuses an edit because the file changed, reread the file, reassess the requested change, and retry using current text. Never work around a refused edit with another write mechanism.',
					'After editing, read the file to verify the result and call finish_edit with success: true. If the request cannot be completed, call finish_edit with success: false and explain the obstacle. Do not claim changes you have not applied.',
				].join('\n\n'),
			);
		});
		api.registerTool(finishQuickEdit, { execute: (result) => { finish(result); return 'Result recorded. End the turn now.'; } });
	});
	return [
		instructionsExtension.extension,
		filesystemBundle.extensions.readFile,
		filesystemBundle.extensions.editFile,
		filesystemBundle.extensions.glob,
		filesystemBundle.extensions.grep,
		editing,
	];
}
