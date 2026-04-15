import {
	createPersistedStore,
	createStore,
	type PersistedStore,
} from '@franklin/extensions';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
import { joinAbsolute } from '@franklin/lib';

export function createJsonStore<T extends object>(
	filesystem: Filesystem,
	appDir: AbsolutePath,
	opts: { file: string; defaults: T },
): PersistedStore<T> {
	const path = joinAbsolute(appDir, opts.file);
	const { defaults } = opts;

	return createPersistedStore(createStore(defaults), {
		async restore(): Promise<T> {
			const data = await filesystem
				.readFile(path)
				.then((raw) => JSON.parse(new TextDecoder().decode(raw)) as Partial<T>)
				.catch(() => ({}) as Partial<T>);

			return { ...defaults, ...data };
		},
		async persist(value): Promise<void> {
			await filesystem.writeFile(path, JSON.stringify(value, null, 2));
		},
		isEqual(left: T, right: T): boolean {
			return JSON.stringify(left) === JSON.stringify(right);
		},
	});
}
