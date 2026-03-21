export class AsyncEventQueue<T> implements AsyncIterable<T>, AsyncIterator<T> {
	private readonly values: T[] = [];
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
