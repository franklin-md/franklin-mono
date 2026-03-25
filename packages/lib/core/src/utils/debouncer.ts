/**
 * Generic per-key debouncer.
 *
 * Multiple rapid writes for the same key are collapsed into a single
 * call to `writeFn` after `delayMs` of inactivity. Read and delete
 * operations are handled by callers — this only manages debounced writes.
 */
export class Debouncer<V> {
	private pending = new Map<
		string,
		{ timer: ReturnType<typeof setTimeout>; value: V }
	>();

	constructor(
		private readonly writeFn: (key: string, value: V) => Promise<void>,
		private readonly delayMs = 500,
	) {}

	/**
	 * Schedule a debounced write for `key`. Resets the timer if one
	 * is already pending.
	 */
	schedule(key: string, value: V): void {
		this.cancel(key);

		const timer = setTimeout(() => {
			this.pending.delete(key);
			void this.writeFn(key, value);
		}, this.delayMs);

		this.pending.set(key, { timer, value });
	}

	/**
	 * Cancel a pending write for `key` (e.g. on delete).
	 */
	cancel(key: string): void {
		const existing = this.pending.get(key);
		if (existing) {
			clearTimeout(existing.timer);
			this.pending.delete(key);
		}
	}

	/**
	 * Flush all pending writes immediately.
	 * Useful for graceful shutdown.
	 */
	async flush(): Promise<void> {
		const writes: Promise<void>[] = [];

		for (const [key, { timer, value }] of this.pending) {
			clearTimeout(timer);
			writes.push(this.writeFn(key, value));
		}
		this.pending.clear();

		await Promise.all(writes);
	}
}
