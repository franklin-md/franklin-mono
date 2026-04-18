import {
	createPersistedStore,
	createStore,
	type PersistedStore,
} from '@franklin/extensions';
import type { AbsolutePath, Codec, Filesystem } from '@franklin/lib';
import { createSingleFilePersister, joinAbsolute } from '@franklin/lib';

export function createJsonStore<T extends object>(
	filesystem: Filesystem,
	appDir: AbsolutePath,
	opts: { file: string; defaults: T; codec: Codec<T> },
): PersistedStore<T> {
	const path = joinAbsolute(appDir, opts.file);
	const { defaults, codec } = opts;
	const persister = createSingleFilePersister<T>(filesystem, path, codec);

	return createPersistedStore(createStore(defaults), {
		async restore() {
			// `value ?? defaults` only fires on unrecoverable decode failures
			// (corrupt JSON, envelope invalid, version ahead, type error).
			// Routine minor evolution — missing fields, unknown fields —
			// is handled inside the codec's zod schema via .default() /
			// non-strict objects, so those paths return a valid `value`.
			const { value, issues } = await persister.load();
			return { value: value ?? defaults, issues };
		},
		async persist(value): Promise<void> {
			await persister.save(value);
		},
		isEqual(left: T, right: T): boolean {
			return JSON.stringify(left) === JSON.stringify(right);
		},
	});
}
