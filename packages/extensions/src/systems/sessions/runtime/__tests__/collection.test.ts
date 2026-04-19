import { describe, expect, it, vi } from 'vitest';
import { SessionCollection } from '../collection.js';
import type { BaseRuntime } from '../../../../algebra/runtime/types.js';
import type { EmptyState } from '../../../identity/state.js';

type TestRuntime = BaseRuntime<EmptyState>;

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

	it('notifies subscribers with add/remove events', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const listener = vi.fn();
		const rt = mockRuntime();

		collection.subscribe(listener);
		collection.set('session-1', rt);
		await collection.remove('session-1');

		expect(listener).toHaveBeenCalledTimes(2);
		expect(listener).toHaveBeenNthCalledWith(1, {
			action: 'add',
			id: 'session-1',
			runtime: rt,
		});
		expect(listener).toHaveBeenNthCalledWith(2, {
			action: 'remove',
			id: 'session-1',
			runtime: rt,
		});
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

	it('fires remove event before dispose', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const rt = mockRuntime();
		let disposedAtNotify = false;

		collection.subscribe((event) => {
			if (event.action === 'remove') {
				disposedAtNotify =
					(rt.dispose as ReturnType<typeof vi.fn>).mock.calls.length > 0;
			}
		});

		collection.set('session-1', rt);
		await collection.remove('session-1');

		expect(disposedAtNotify).toBe(false);
		expect(rt.dispose).toHaveBeenCalledOnce();
	});

	it('does not call dispose when removing a missing entry', async () => {
		const collection = new SessionCollection<TestRuntime>();

		expect(await collection.remove('missing')).toBe(false);
	});
});
