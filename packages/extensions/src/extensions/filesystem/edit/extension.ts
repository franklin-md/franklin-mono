import { z } from 'zod';
import type { Extension } from '../../../types/extension.js';
import type { CoreAPI } from '../../../api/core/api.js';
import type { EnvironmentAPI } from '../../../api/environment/api.js';
import { decode } from './text/encoding.js';
import {
	detectLineEnding,
	normalizeToLF,
	restoreLineEndings,
} from './text/line-endings.js';
import { findUnique } from './match/find-unique.js';
import { applyReplacement } from './replace.js';

/**
 * Extension that registers an `edit_file` tool for precise,
 * surgical text replacements.
 *
 * The tool finds an exact (or fuzzy) match of `old_text` in the file
 * and replaces it with `new_text`. The match must be unique — if the
 * text appears more than once, the agent must provide more surrounding
 * context to disambiguate.
 *
 * Platform-agnostic: reads/writes via the Environment filesystem.
 */
export function editExtension(): Extension<CoreAPI & EnvironmentAPI> {
	return (api) => {
		const env = api.getEnvironment();

		api.registerTool({
			name: 'edit_file',
			description:
				'Edit a file by replacing exact text. ' +
				'The old_text must match exactly (including whitespace and newlines). ' +
				'Use this for precise, surgical edits. ' +
				'For new files or complete rewrites, use write_file instead.',
			schema: z.object({
				path: z
					.string()
					.describe('Path to the file to edit (relative or absolute)'),
				old_text: z
					.string()
					.describe('Exact text to find and replace (must match file content)'),
				new_text: z.string().describe('New text to replace the old text with'),
			}),
			async execute({
				path,
				old_text,
				new_text,
			}: {
				path: string;
				old_text: string;
				new_text: string;
			}) {
				// 1. Read + decode
				let bytes: Uint8Array;
				try {
					bytes = await env.filesystem.readFile(path);
				} catch {
					throw new Error(`File not found: ${path}`);
				}
				const { bom, text } = decode(bytes);

				// 2. Normalize line endings for matching
				const ending = detectLineEnding(text);
				const normalized = normalizeToLF(text);
				const normalizedOld = normalizeToLF(old_text);
				const normalizedNew = normalizeToLF(new_text);

				// 3. Find unique match
				const match = findUnique(normalized, normalizedOld);

				if (!match.found) {
					if (match.ambiguous) {
						throw new Error(
							`Found multiple occurrences of the text in ${path}. The text must be unique. Please provide more surrounding context to make it unique.`,
						);
					}
					throw new Error(
						`Could not find the specified text in ${path}. The old_text must match exactly including all whitespace and newlines.`,
					);
				}

				// 4. Apply replacement
				const replaced = applyReplacement(
					match.content,
					match.index,
					match.length,
					normalizedNew,
				);

				// 5. Verify change
				if (match.content === replaced) {
					throw new Error(
						`No changes made to ${path}. The replacement produced identical content.`,
					);
				}

				// 6. Restore encoding + write
				const final = bom + restoreLineEndings(replaced, ending);
				await env.filesystem.writeFile(path, final);

				return { message: `Successfully edited ${path}.` };
			},
		});
	};
}
