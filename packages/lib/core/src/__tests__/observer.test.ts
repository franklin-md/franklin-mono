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
});
