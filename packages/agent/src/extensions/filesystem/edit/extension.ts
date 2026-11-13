import { defineExtension } from '../../../modules/state/index.js';
import type { CoreModule } from '../../../modules/core/index.js';
import type { EnvironmentModule } from '../../../modules/environment/index.js';
import type { StoreModule } from '../../../modules/store/index.js';
import { createFileControl } from '../common/control.js';
import { fileKey } from '../common/key.js';
import { sha256Hex } from '../hash.js';
import { findUnique } from './match/find-unique.js';
import { applyReplacement } from './replace.js';
import { decode } from './text/encoding.js';
import {
	detectLineEnding,
	normalizeToLF,
	restoreLineEndings,
} from './text/line-endings.js';
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
			api.registerStore(fileKey, {}, 'private');
			api.registerTool(editFileSpec, {
				execute: async ({ path, old_text, new_text, replace_all }, ctx) => {
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

					const changed =
						(typeof fileRecord === 'string' ? fileRecord : fileRecord.hash) !==
						hash;
					if (changed && (typeof fileRecord === 'string' || replace_all)) {
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
						// 3b. Find unique match
						const snapshot =
							typeof fileRecord === 'string'
								? normalized
								: normalizeToLF(fileRecord.text);
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

						const target = changed
							? match.fuzzy
								? undefined
								: currentMatchRange(snapshot, text, match.index, match.length)
							: match;
						if (target === undefined) {
							throw new Error(
								`Target lines have changed or shifted since last read, or the edit requires fuzzy matching. Reread ${path} before retrying.`,
							);
						}
						replaced = applyReplacement(
							changed ? text : match.content,
							target.index,
							target.length,
							changed
								? restoreLineEndings(normalizedNew, ending)
								: normalizedNew,
						);
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

function currentMatchRange(
	snapshot: string,
	current: string,
	index: number,
	length: number,
): { index: number; length: number } | undefined {
	if (length === 0) return undefined;
	// Keep newline terminators: a match ending at a newline touches that line,
	// not the next one. Compare whole lines, never search/remap the current text.
	const savedLines = snapshot.match(/[^\n]*\n|[^\n]+$/g) ?? [];
	const currentLines = current.match(/[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$/g) ?? [];
	const first = snapshot.slice(0, index).split('\n').length - 1;
	const last = snapshot.slice(0, index + length - 1).split('\n').length - 1;
	if (
		savedLines
			.slice(first, last + 1)
			.some(
				(line, offset) =>
					line !== normalizeToLF(currentLines[first + offset] ?? ''),
			)
	) {
		return undefined;
	}
	// Recompute offsets from current line lengths, retaining its raw line endings.
	const start =
		currentLines.slice(0, first).join('').length +
		index -
		savedLines.slice(0, first).join('').length;
	const endLine = snapshot.slice(0, index + length).split('\n').length - 1;
	const end =
		currentLines.slice(0, endLine).join('').length +
		index +
		length -
		savedLines.slice(0, endLine).join('').length;
	return { index: start, length: end - start };
}
