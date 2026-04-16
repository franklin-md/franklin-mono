import { describe, expect, it } from 'vitest';

import { fromObserver } from '../readable/from-observer.js';

describe('fromObserver', () => {
	it('creates a readable from a subscribe function', async () => {
		const listeners = new Set<(data: string) => void>();
		const subscribe = (cb: (data: string) => void) => {
			listeners.add(cb);
			return () => listeners.delete(cb);
		};

		const readable = fromObserver(subscribe);
		const reader = readable.getReader();

		for (const listener of listeners) listener('hello');

		const { value } = await reader.read();
		expect(value).toBe('hello');

		reader.releaseLock();
	});

	it('unsubscribes when the readable is cancelled', async () => {
		let unsubscribed = false;
		const subscribe = (_cb: (data: string) => void) => {
			return () => {
				unsubscribed = true;
			};
		};

		const readable = fromObserver(subscribe);
		const reader = readable.getReader();
		await reader.cancel();

		expect(unsubscribed).toBe(true);
	});

	it('enqueues multiple values', async () => {
		const listeners = new Set<(data: number) => void>();
		const subscribe = (cb: (data: number) => void) => {
			listeners.add(cb);
			return () => listeners.delete(cb);
		};

		const readable = fromObserver(subscribe);
		const reader = readable.getReader();

		for (const listener of listeners) listener(1);
		for (const listener of listeners) listener(2);
		for (const listener of listeners) listener(3);

		expect((await reader.read()).value).toBe(1);
		expect((await reader.read()).value).toBe(2);
		expect((await reader.read()).value).toBe(3);

		reader.releaseLock();
	});
});
