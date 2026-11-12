import type { z } from 'zod';
import { createStore } from '@franklin/agent';
import type { ReadonlyStore } from '@franklin/agent';
import type { SingleFilePersister } from '@franklin/lib';
import type { QuickEditSettings } from '../types.js';
import { quickEditSettingsSchema } from './schema.js';

export class QuickEditPreferences {
	private readonly store;
	readonly state: ReadonlyStore<QuickEditSettings>;
	private pending = Promise.resolve();
	private closed = false;

	private constructor(
		private readonly persistence: SingleFilePersister<QuickEditSettings>,
		initial: QuickEditSettings,
	) {
		this.store = createStore(initial);
		this.state = this.store;
	}

	static async create(
		persistence: SingleFilePersister<QuickEditSettings>,
		defaults: z.input<typeof quickEditSettingsSchema>,
	): Promise<QuickEditPreferences> {
		const restored = await persistence.load();
		if (restored.issues.length)
			throw new Error(
				'Could not load quick edit settings; saved settings were preserved',
			);
		return new QuickEditPreferences(
			persistence,
			quickEditSettingsSchema.parse(restored.value ?? defaults),
		);
	}

	configure(update: Partial<QuickEditSettings>): Promise<void> {
		if (this.closed)
			return Promise.reject(new Error('Quick edit settings are closed'));
		const save = this.pending.then(async () => {
			const next = quickEditSettingsSchema.parse({
				...this.store.get(),
				...update,
			});
			await this.persistence.save(next);
			this.store.set(() => next);
		});
		this.pending = save.catch(() => {});
		return save;
	}

	async dispose(): Promise<void> {
		this.closed = true;
		await this.pending;
	}
}
