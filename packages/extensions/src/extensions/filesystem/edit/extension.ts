import { z } from 'zod';
import type { Extension } from '../../../types/extension.js';
import type { CoreAPI } from '../../../api/core/api.js';
import type { EnvironmentAPI } from '../../../api/environment/api.js';
import { sha256Hex } from '../hash.js';
import { editFileDescription } from '../../system_prompts.js';
import { decode } from './text/encoding.js';
import {
	detectLineEnding,
	normalizeToLF,
	restoreLineEndings,
} from './text/line-endings.js';
import { findUnique } from './match/find-unique.js';
import { applyReplacement } from './replace.js';
import type { StoreAPI } from 'packages/extensions/src/api/index.js';
import { fileKey } from './key.js';

const schema = z.object({
	path: z.string().describe('Path to the file to edit (relative or absolute)'),
	old_text: z
		.string()
		.describe('Exact text to find and replace (must match file content)'),
	new_text: z.string().describe('New text to replace the old text with'),
	replace_all: z
		.boolean()
		.optional()
		.describe(
			'If true, replace all occurrences of old_text. If false or omitted, the text must appear exactly once.',
		),
});

type EditInput = z.infer<typeof schema>;

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
export function editExtension(): Extension<
	CoreAPI & EnvironmentAPI & StoreAPI
> {
	return (api) => {
		const env = api.getEnvironment();
		// The store is private to ONE agent; it keeps track of the agent's "seen" files.
		const store = api.registerStore(fileKey, {}, 'private');
		api.registerTool({
			name: 'edit_file',
			description: editFileDescription,
			schema: schema,
			async execute({ path, old_text, new_text, replace_all }: EditInput) {
				// 1. Read + decode
				let bytes: Uint8Array;
				try {
					bytes = await env.filesystem.readFile(path);
				} catch {
					const message = `File not found: ${path}`;
					console.error(`[edit_file] ${message}`);
					throw new Error(message);
				}

				const hash = sha256Hex(bytes);
				const absPath = await env.filesystem.resolve(path);

				const fileRecord = store.get()[absPath];
				if (fileRecord === undefined) {
					const message = 'File cannot be edited if you have never read it.';
					console.error(`[edit_file] ${message} (path: ${path})`);
					throw new Error(message);
				}

				if (fileRecord !== hash) {
					const message = `File has changed since last read. Refusing to edit.`;
					console.error(`[edit_file] ${message} (path: ${path})`);
					throw new Error(message);
				}
				const { bom, text } = decode(bytes);

				// 2. Normalize line endings for matching
				const ending = detectLineEnding(text);
				const normalized = normalizeToLF(text);
				const normalizedOld = normalizeToLF(old_text);
				const normalizedNew = normalizeToLF(new_text);

				let replaced: string;

				if (replace_all) {
					// 3a. Replace all occurrences
					if (!normalized.includes(normalizedOld)) {
						const message = `Could not find the specified text in ${path}. The old_text must match exactly including all whitespace and newlines.`;
						console.error(`[edit_file] ${message}`);
						throw new Error(message);
					}
					replaced = normalized.split(normalizedOld).join(normalizedNew);
				} else {
					// 3b. Find unique match
					const match = findUnique(normalized, normalizedOld);

					if (!match.found) {
						if (match.ambiguous) {
							const message = `Found multiple occurrences of the text in ${path}. The text must be unique. Please provide more surrounding context to make it unique.`;
							console.error(`[edit_file] ${message}`);
							throw new Error(message);
						}
						const message = `Could not find the specified text in ${path}. The old_text must match exactly including all whitespace and newlines.`;
						console.error(`[edit_file] ${message}`);
						throw new Error(message);
					}

					replaced = applyReplacement(
						match.content,
						match.index,
						match.length,
						normalizedNew,
					);
				}

				// 4. Verify change
				if (normalized === replaced) {
					const message = `No changes made to ${path}. The replacement produced identical content.`;
					console.error(`[edit_file] ${message}`);
					throw new Error(message);
				}

				// 5. Restore encoding + write
				const final = bom + restoreLineEndings(replaced, ending);
				await env.filesystem.writeFile(path, final);

				return { message: `Successfully edited ${path}.` };
			},
		});
	};
}
