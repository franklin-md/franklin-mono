import type { QuickEditRequest } from '../types.js';

export function quickEditPrompt({
	directive,
	state,
	settings,
}: QuickEditRequest): string {
	return [
		`Edit the existing note ${JSON.stringify(state.path)}. The request originated around line ${state.line + 1}.`,
		'The cursor location and selected passage are context, not fixed edit boundaries. Make the requested changes on the same line, below it, or elsewhere nearby as appropriate.',
		`The active directive for this request is exactly ${JSON.stringify(directive)}. You may relocate this token within the originating note while editing, preferably to the top or bottom of the cohesive edited region. Keep exactly one discoverable copy, unchanged and outside code or literal Markdown. Do not move, copy, delete or modify other directives.`,
		'Calling finish_edit with success: true requests application deletion of this active directive and cleanup of its request-only row or bullet, preserving prose and outline children. Do not delete it yourself. Success ends this request; further edits require a new request.',
		`Selected passage (context only):\n${state.selection || '(no selection)'}`,
		`Editing instructions:\n${settings.instructions}`,
		`User request:\n${state.prompt}`,
	].join('\n\n');
}
