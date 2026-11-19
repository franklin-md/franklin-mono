import type { QuickEditPreset } from './types.js';

export function createDefaultPresets(): QuickEditPreset[] {
	return [
		{
			id: 'link',
			name: 'Link',
			prompt: [
				'Find the one existing vault note most meaningfully related to the selected passage, or the current bullet/row when nothing is selected. Read the originating note with read_file, including parent bullets, the surrounding group/section and the note as a whole. Prefer a strong specific match to the starting focus; broaden to the group or whole-note discussion only when that produces a stronger meaningful match. Superficial keyword overlap is not enough.',
				'Search note titles with glob and search aliases and contents with grep. Read promising candidate notes with read_file before choosing. Verify that the destination is a real Markdown note and that the link resolves unambiguously to it; a matching title or alias alone is not verification. Use a vault-relative qualified path if a bare note name could resolve to more than one file.',
				'Use edit_file to insert at most one wikilink beside the passage or scope it actually matches. The only substantive inserted content must be [[Note]] (or [[folder/Note]] when required), with only necessary surrounding whitespace. Never add a Related prefix, explanatory prose, a list of candidates or a new heading. Preserve the selected passage, existing prose, links, indentation and outline exactly; do not replace the passage with the link or reorganize the note.',
				'Only edit the originating note; never create or modify a destination note. Do not link to the originating note itself. Check existing links throughout the originating note, including aliases and qualified paths, and do not duplicate an already-linked destination. Do not force a weak match or guess between ambiguous destinations.',
				'If no convincing, verified, unambiguous and not-already-linked candidate remains, make no edit to the note content. Call finish_edit with success: false and a concise summary explaining why no link was inserted. Keep that explanation out of the note. After inserting a link, reread the originating note to verify the link and preserved content, then call finish_edit with success: true.',
			].join('\n\n'),
			icon: 'lucide-link',
			color: 'blue',
		},
	];
}
