import type { QuickEditRequest } from '../types.js';

export function quickEditPrompt({ state, settings }: QuickEditRequest): string {
	return [
		`Edit the existing note ${JSON.stringify(state.path)}. The request originated around line ${state.line + 1}.`,
		'The cursor location and selected passage are context, not fixed edit boundaries. Make the requested changes on the same line, below it, or elsewhere nearby as appropriate.',
		`Selected passage (context only):\n${state.selection || '(no selection)'}`,
		`Editing instructions:\n${settings.instructions}`,
		`User request:\n${state.prompt}`,
	].join('\n\n');
}
