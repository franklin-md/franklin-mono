import { Debouncer } from '../../utils/debouncer.js';
import type { MapFilePersister, MapLoadResult } from './types.js';

/**
 * Wraps a `MapFilePersister` with per-key debouncing on `save()`.
 *
 * Multiple rapid saves for the same id collapse into a single write after
 * `delayMs` of inactivity. Load passes through immediately; delete also
 * cancels any pending save.
 */
export class DebouncedPersister<T> implements MapFilePersister<T> {
	private readonly debouncer: Debouncer<T>;

	constructor(
		private readonly inner: MapFilePersister<T>,
		delayMs = 500,
	) {
		this.debouncer = new Debouncer(
			(id, snapshot) => inner.save(id, snapshot),
			delayMs,
		);
	}

	save(id: string, snapshot: T): Promise<void> {
		this.debouncer.schedule(id, snapshot);
		return Promise.resolve();
	}

	load(): Promise<MapLoadResult<T>> {
		return this.inner.load();
	}

	async delete(id: string): Promise<void> {
		this.debouncer.cancel(id);
		return this.inner.delete(id);
	}

	/** Flush all pending saves immediately. Useful for graceful shutdown. */
	async flush(): Promise<void> {
		await this.debouncer.flush();
	}
}
