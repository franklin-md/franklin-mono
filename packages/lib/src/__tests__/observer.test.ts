import { describe, expect, it, vi } from 'vitest';

import { createObserver } from '../utils/observer.js';

describe('createObserver', () => {
	it('notifies listeners without args by default', () => {
		const observer = createObserver();
		const listener = vi.fn();

		const unsubscribe = observer.subscribe(listener);

		observer.notify();
		unsubscribe();
		observer.notify();

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('forwards typed args to listeners', () => {
		const observer = createObserver<[string, number]>();
		const listener = vi.fn();

		observer.subscribe(listener);
		observer.notify('ready', 2);

		expect(listener).toHaveBeenCalledWith('ready', 2);
	});

	it('tracks subscribed listener count', () => {
		const observer = createObserver();
		const first = vi.fn();
		const second = vi.fn();

		const unsubscribeFirst = observer.subscribe(first);
		const unsubscribeSecond = observer.subscribe(second);

		expect(observer.listenerCount).toBe(2);

		unsubscribeFirst();
		expect(observer.listenerCount).toBe(1);

		unsubscribeSecond();
		expect(observer.listenerCount).toBe(0);
	});

	it('can be created with initial listeners', () => {
		const listener = vi.fn();
		const observer = createObserver<[string]>([listener]);

		expect(observer.listenerCount).toBe(1);

		observer.notify('ready');

		expect(listener).toHaveBeenCalledWith('ready');
	});
});
