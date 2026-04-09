import { describe, expect, it, vi } from 'vitest';
import { SessionCollection } from '../../../runtime/session/collection.js';
import type { RuntimeBase } from '../../../runtime/types.js';
import type { SessionState } from '../../../state/session.js';
import type { SessionRuntime } from '../runtime.js';

type TestRuntime = RuntimeBase<SessionState> & SessionRuntime;

function mockRuntime(id: string): TestRuntime {
	return {
		state: vi.fn(async () => ({ session: { id } })),
		fork: vi.fn(async () => ({ session: { id } })),
		child: vi.fn(async () => ({ session: { id } })),
		dispose: vi.fn(async () => {}),
		subscribe: vi.fn(() => () => {}),
		session: {
			child: vi.fn(async () => mockRuntime('child-of-' + id)),
			fork: vi.fn(async () => mockRuntime('fork-of-' + id)),
		},
	};
}

describe('SessionCollection', () => {
	it('supports get, set, has, and remove', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const rt = mockRuntime('1');

		expect(collection.get('session-1')).toBeUndefined();
		expect(collection.has('session-1')).toBe(false);

		collection.set('session-1', rt);

		expect(collection.get('session-1')).toBe(rt);
		expect(collection.has('session-1')).toBe(true);
		expect(await collection.remove('session-1')).toBe(true);
		expect(collection.get('session-1')).toBeUndefined();
		expect(collection.has('session-1')).toBe(false);
		expect(await collection.remove('session-1')).toBe(false);
	});

	it('lists keys and entries', () => {
		const collection = new SessionCollection<TestRuntime>();
		const rt1 = mockRuntime('1');
		const rt2 = mockRuntime('2');

		collection.set('session-1', rt1);
		collection.set('session-2', rt2);

		expect(collection.list()).toEqual(['session-1', 'session-2']);
	});

	it('notifies subscribers on set and remove', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const listener = vi.fn();

		collection.subscribe(listener);
		collection.set('session-1', mockRuntime('1'));
		await collection.remove('session-1');

		expect(listener).toHaveBeenCalledTimes(2);
	});

	it('stops notifying after unsubscribe', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const listener = vi.fn();

		const unsubscribe = collection.subscribe(listener);
		unsubscribe();

		collection.set('session-1', mockRuntime('1'));
		await collection.remove('session-1');

		expect(listener).not.toHaveBeenCalled();
	});

	it('calls dispose on the runtime when removing', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const rt = mockRuntime('1');

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
