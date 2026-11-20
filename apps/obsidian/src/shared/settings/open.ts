import type { z } from 'zod';
import { createStore } from '@franklin/agent';
import type { SingleFilePersister } from '@franklin/lib';
import type { SettingsFile, SettingsUpdate } from './types.js';

type Options<T, Input> = {
	// Names the settings in errors, such as "quick edit settings".
	name: string;
	persistence: SingleFilePersister<T>;
	schema: z.ZodType<T, Input>;
	// Used when the file does not exist yet.
	defaults: Input;
};

export async function openSettingsFile<T extends object, Input>({
	name,
	persistence,
	schema,
	defaults,
}: Options<T, Input>): Promise<SettingsFile<T>> {
	const restored = await persistence.load();
	if (restored.issues.length)
		throw new Error(`Could not load ${name}; saved settings were preserved`);
	const store = createStore(schema.parse(restored.value ?? defaults));
	let pending = Promise.resolve();
	let closed = false;
	function configure(update: SettingsUpdate<T>): Promise<void> {
		if (closed) return Promise.reject(new Error(`The ${name} are closed`));
		const save = pending.then(async () => {
			const current = store.get();
			// An updater sees the result of every write queued before it, so two
			// list edits in flight cannot both start from the same old list.
			const patch = typeof update === 'function' ? update(current) : update;
			const next = schema.parse({ ...current, ...patch });
			await persistence.save(next);
			store.set(() => next);
		});
		pending = save.catch(() => {});
		return save;
	}
	return {
		get: () => store.get(),
		subscribe: (listener) => store.subscribe(listener),
		configure,
		async dispose() {
			closed = true;
			await pending;
		},
	};
}
