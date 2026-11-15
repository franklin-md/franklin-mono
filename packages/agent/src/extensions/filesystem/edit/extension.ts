import { defineExtension } from '../../../modules/state/index.js';
import type { CoreModule } from '../../../modules/core/index.js';
import type { EnvironmentModule } from '../../../modules/environment/index.js';
import type { StoreModule } from '../../../modules/store/index.js';
import { fileRecordCodec } from '../common/codec.js';
import { createFileControl } from '../common/control.js';
import { fileKey } from '../common/key.js';
import { decode } from '../common/text/encoding.js';
import {
	detectLineEnding,
	normalizeToLF,
	restoreLineEndings,
} from '../common/text/line-endings.js';
import { findUnique } from './match/find-unique.js';
import { linesTouchedByMatch } from './match/lines-touched.js';
import { mapMatchToCurrentText } from './match/map-to-current-text.js';
import { applyReplacement } from './replace.js';
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
export function editExtension() {
	return defineExtension<[CoreModule, StoreModule, EnvironmentModule]>(
		(api) => {
			// The store is private to ONE agent; it keeps track of the agent's "seen" files.
			api.registerStore(fileKey, {}, 'private', fileRecordCodec);
			api.registerTool(editFileSpec, {
				execute: async ({ path, old_text, new_text, replace_all }, ctx) => {
					const env = ctx.environment;
					const file = createFileControl(ctx.getStore(fileKey));
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

					const saved = await file.getSnapshot(env.filesystem, absPath);
					const changed = await file.changedSinceRead(
						env.filesystem,
						absPath,
						bytes,
					);
					if (changed && (saved.text === undefined || replace_all)) {
						const message = `File has changed since last read. Reread ${path} before editing without a text snapshot or using replace_all.`;
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
						// 3b. Find a unique match in the saved snapshot
						const snapshot = normalizeToLF(saved.text ?? text);
						const match = findUnique(snapshot, normalizedOld);

						if (!match.found) {
							if (match.ambiguous) {
								const message = `Found multiple occurrences of the text in the last read of ${path}. The text must be unique. Please provide more surrounding context to make it unique.`;
								console.error(`[edit_file] ${message}`);
								throw new Error(message);
							}
							const message = `Could not find the specified text in the last read of ${path}. The old_text must match exactly including all whitespace and newlines.`;
							console.error(`[edit_file] ${message}`);
							throw new Error(message);
						}

						if (changed) {
							const targetLines = match.fuzzy
								? undefined
								: linesTouchedByMatch(snapshot, match.index, match.length);
							if (
								!targetLines ||
								(await file.changedSinceRead(
									env.filesystem,
									absPath,
									bytes,
									targetLines,
								))
							) {
								throw new Error(
									`Target lines have changed or shifted since last read, or the edit requires fuzzy matching. Reread ${path} before retrying.`,
								);
							}
							const target = mapMatchToCurrentText(
								snapshot,
								text,
								match.index,
								match.length,
							);
							replaced = applyReplacement(
								text,
								target.index,
								target.length,
								restoreLineEndings(normalizedNew, ending),
							);
						} else {
							replaced = applyReplacement(
								match.content,
								match.index,
								match.length,
								normalizedNew,
							);
						}
					}

					// 4. Verify change
					if ((changed ? text : normalized) === replaced) {
						const message = `No changes made to ${path}. The replacement produced identical content.`;
						console.error(`[edit_file] ${message}`);
						throw new Error(message);
					}

					// 5. Restore encoding + write
					const final =
						bom + (changed ? replaced : restoreLineEndings(replaced, ending));
					await env.filesystem.writeFile(absPath, final);

					// 6. Refresh the snapshot so consecutive edits don't require a re-read

					// TODO: race conditions between agents.
					await file.markFileRead(env.filesystem, path, final);

					return `Successfully edited ${path}.`;
				},
			});
		},
	);
}
