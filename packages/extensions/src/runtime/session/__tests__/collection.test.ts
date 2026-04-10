import { describe, expect, it, vi } from 'vitest';
import { SessionCollection } from '../collection.js';
import type { RuntimeBase } from '../../types.js';
import type { EmptyState } from '../../../state/empty.js';

type TestRuntime = RuntimeBase<EmptyState>;

function mockRuntime(): TestRuntime {
	return {
		state: vi.fn(async () => ({})),
		fork: vi.fn(async () => ({})),
		child: vi.fn(async () => ({})),
		dispose: vi.fn(async () => {}),
		subscribe: vi.fn(() => () => {}),
	};
}

describe('SessionCollection', () => {
	it('supports get, set, has, and remove', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const rt = mockRuntime();

		expect(collection.get('session-1')).toBeUndefined();
		expect(collection.has('session-1')).toBe(false);

		collection.set('session-1', rt);

		expect(collection.get('session-1')).toEqual({
			id: 'session-1',
			runtime: rt,
		});
		expect(collection.has('session-1')).toBe(true);
		expect(await collection.remove('session-1')).toBe(true);
		expect(collection.get('session-1')).toBeUndefined();
		expect(collection.has('session-1')).toBe(false);
		expect(await collection.remove('session-1')).toBe(false);
	});

	it('lists sessions as Session<RT> entries', () => {
		const collection = new SessionCollection<TestRuntime>();
		const rt1 = mockRuntime();
		const rt2 = mockRuntime();

		collection.set('session-1', rt1);
		collection.set('session-2', rt2);

		expect(collection.list()).toEqual([
			{ id: 'session-1', runtime: rt1 },
			{ id: 'session-2', runtime: rt2 },
		]);
	});

	it('notifies subscribers on set and remove', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const listener = vi.fn();

		collection.subscribe(listener);
		collection.set('session-1', mockRuntime());
		await collection.remove('session-1');

		expect(listener).toHaveBeenCalledTimes(2);
	});

	it('stops notifying after unsubscribe', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const listener = vi.fn();

		const unsubscribe = collection.subscribe(listener);
		unsubscribe();

		collection.set('session-1', mockRuntime());
		await collection.remove('session-1');

		expect(listener).not.toHaveBeenCalled();
	});

	it('calls dispose on the runtime when removing', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const rt = mockRuntime();

		collection.set('session-1', rt);
		await collection.remove('session-1');

		expect(rt.dispose).toHaveBeenCalledOnce();
		expect(collection.has('session-1')).toBe(false);
	});

	it('does not call dispose when removing a missing entry', async () => {
		const collection = new SessionCollection<TestRuntime>();

		expect(await collection.remove('missing')).toBe(false);
	});
});
