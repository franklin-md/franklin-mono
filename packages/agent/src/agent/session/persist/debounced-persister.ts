import type { Persister, SessionSnapshot } from './types.js';

type PendingEntry = {
	timer: ReturnType<typeof setTimeout>;
	snapshot: SessionSnapshot;
};

/**
 * Wraps a Persister with per-session debouncing on `save()`.
 *
 * Multiple rapid saves for the same session ID are collapsed into a
 * single write after `delayMs` of inactivity. `load()` and `delete()`
 * pass through immediately (`delete` also cancels any pending save).
 */
export class DebouncedPersister implements Persister {
	private pending = new Map<string, PendingEntry>();

	constructor(
		private readonly inner: Persister,
		private readonly delayMs = 500,
	) {}

	save(id: string, snapshot: SessionSnapshot): Promise<void> {
		this.cancelPending(id);

		const timer = setTimeout(() => {
			this.pending.delete(id);
			void this.inner.save(id, snapshot);
		}, this.delayMs);

		this.pending.set(id, { timer, snapshot });
		return Promise.resolve();
	}

	load(): Promise<SessionSnapshot[]> {
		return this.inner.load();
	}

	async delete(id: string): Promise<void> {
		this.cancelPending(id);
		return this.inner.delete(id);
	}

	/**
	 * Flush all pending saves immediately.
	 * Useful for graceful shutdown.
	 */
	async flush(): Promise<void> {
		const writes: Promise<void>[] = [];

		for (const [id, { timer, snapshot }] of this.pending) {
			clearTimeout(timer);
			writes.push(this.inner.save(id, snapshot));
		}
		this.pending.clear();

		await Promise.all(writes);
	}

	private cancelPending(id: string): void {
		const existing = this.pending.get(id);
		if (existing) {
			clearTimeout(existing.timer);
			this.pending.delete(id);
		}
	}
}
