// Async channel that bridges push-based producers with pull-based consumers
// (for-await-of). Behaves in two modes:
//
//   1. Buffered (sync-resolved) — when values have been pushed before the
//      consumer calls next(), the returned Promise is already settled.
//      The caller still awaits it, but only pays microtask overhead.
//
//   2. Pending (future) — when the consumer calls next() before any value
//      is available, the returned Promise stays pending until push() is
//      called by the producer.
//
export class AsyncEventQueue<T> implements AsyncIterable<T>, AsyncIterator<T> {
	// Buffered values waiting for a consumer (mode 1: sync-resolved path)
	private readonly values: T[] = [];
	// Pending consumers waiting for a producer (mode 2: future path)
	private readonly waiters: Array<{
		resolve: (result: IteratorResult<T>) => void;
		reject: (reason: Error) => void;
	}> = [];
	private done = false;
	private failure: Error | null = null;

	constructor(private readonly onReturn: () => void) {}

	[Symbol.asyncIterator](): AsyncIterator<T> {
		return this;
	}

	next(): Promise<IteratorResult<T>> {
		// Mode 1: value already buffered — resolve immediately (microtask only)
		if (this.values.length > 0) {
			const value = this.values.shift() as T;
			return Promise.resolve({ done: false, value });
		}
		if (this.failure) {
			return Promise.reject(this.failure);
		}
		if (this.done) {
			return Promise.resolve({ done: true, value: undefined });
		}
		// Mode 2: no value yet — park this consumer until push() delivers one
		return new Promise<IteratorResult<T>>((resolve, reject) => {
			this.waiters.push({ resolve, reject });
		});
	}

	return(): Promise<IteratorResult<T>> {
		if (!this.done && this.failure === null) {
			this.onReturn();
		}
		this.finish();
		return Promise.resolve({ done: true, value: undefined });
	}

	push(value: T): void {
		if (this.done || this.failure) return;
		// If a consumer is already parked, deliver directly (skips the buffer)
		const waiter = this.waiters.shift();
		if (waiter) {
			waiter.resolve({ done: false, value });
			return;
		}
		this.values.push(value);
	}

	complete(): void {
		if (this.done || this.failure) return;
		this.done = true;
		while (this.waiters.length > 0) {
			this.waiters.shift()?.resolve({ done: true, value: undefined });
		}
	}

	fail(error: Error): void {
		if (this.done || this.failure) return;
		this.failure = error;
		while (this.waiters.length > 0) {
			this.waiters.shift()?.reject(error);
		}
	}

	private finish(): void {
		if (this.done) return;
		this.done = true;
		this.values.length = 0;
		while (this.waiters.length > 0) {
			this.waiters.shift()?.resolve({ done: true, value: undefined });
		}
	}
}
