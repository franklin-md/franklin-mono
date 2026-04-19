import type { Extension } from '../../../algebra/types/index.js';
import type { CoreAPI } from '../../../systems/core/index.js';
import type { EnvironmentRuntime } from '../../../systems/environment/runtime.js';
import { sha256Hex } from '../hash.js';
import { decode } from './text/encoding.js';
import {
	detectLineEnding,
	normalizeToLF,
	restoreLineEndings,
} from './text/line-endings.js';
import { findUnique } from './match/find-unique.js';
import { applyReplacement } from './replace.js';
import type { StoreAPI } from '../../../systems/store/index.js';
import type { StoreRuntime } from '../../../systems/store/runtime.js';
import { fileKey } from '../common/key.js';
import { createFileControl } from '../common/control.js';
import { editFileSpec } from './tools.js';

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
	CoreAPI<EnvironmentRuntime & StoreRuntime> & StoreAPI
> {
	return (api) => {
		// The store is private to ONE agent; it keeps track of the agent's "seen" files.
		api.registerStore(fileKey, {}, 'private');
		api.registerTool(
			editFileSpec,
			async ({ path, old_text, new_text, replace_all }, ctx) => {
				const env = ctx.environment;
				const store = ctx.getStore(fileKey);
				const file = createFileControl(store);
				// 1. Read + decode
				const absPath = await env.filesystem.resolve(path);
				let bytes: Uint8Array;
				try {
					bytes = await env.filesystem.readFile(absPath);
				} catch {
					const message = `File not found: ${path}`;
					console.error(`[edit_file] ${message}`);
					throw new Error(message);
				}

				const hash = sha256Hex(bytes);

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
				await env.filesystem.writeFile(absPath, final);

				// 6. Refresh the read hash so consecutive edits don't require a re-read
				await file.markFileRead(env.filesystem, path, final);

				return `Successfully edited ${path}.`;
			},
		);
	};
}
