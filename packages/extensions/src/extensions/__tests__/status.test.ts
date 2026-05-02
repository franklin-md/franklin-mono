import { describe, it, expect, vi } from 'vitest';
import type { MiniACPClient, TurnEnd } from '@franklin/mini-acp';
import { StopCode } from '@franklin/mini-acp';
import { apply } from '@franklin/lib/middleware';
import { compileCoreWithStore } from '../../testing/compile-ext.js';
import { createStatusControl } from '../status/control.js';
import { statusExtension } from '../status/extension.js';
import { statusKey } from '../status/key.js';
import type { StoreRuntime } from '../../modules/store/runtime.js';
import type { StatusState } from '../status/types.js';

type StubOverrides = { [K in keyof MiniACPClient]?: (...args: any[]) => any };

function stubClient(overrides: StubOverrides = {}): MiniACPClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async () => {}),
		prompt: vi.fn(async function* () {}),
		cancel: vi.fn(async () => ({ type: 'turn_end' as const, turn: 'end' })),
		...overrides,
	} as unknown as MiniACPClient;
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const items: T[] = [];
	for await (const item of iter) items.push(item);
	return items;
}

function compileWithStatus() {
	return compileCoreWithStore(statusExtension());
}

function getStatus(stores: StoreRuntime): StatusState {
	return stores.getStore(statusKey).get();
}

describe('statusExtension', () => {
	it('initializes the status store to idle', async () => {
		const { stores } = await compileWithStatus();
		expect(getStatus(stores)).toBe('idle');
	});

	it('moves to in-progress when a prompt is sent', async () => {
		const { middleware, stores } = await compileWithStatus();
		const target = stubClient();
		const wrapped = apply(middleware.client, target);

		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			}),
		);

		expect(getStatus(stores)).toBe('in-progress');
	});

	it('moves to unread when the turn ends', async () => {
		const { middleware, stores } = await compileWithStatus();
		const turnEnd: TurnEnd = { type: 'turnEnd', stopCode: StopCode.Finished };
		const target = stubClient({
			prompt: async function* () {
				yield turnEnd;
			},
		});
		const wrapped = apply(middleware.client, target);

		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			}),
		);

		expect(getStatus(stores)).toBe('unread');
	});

	it('markRead clears unread back to idle', async () => {
		const { stores } = await compileWithStatus();
		const control = createStatusControl(stores.getStore(statusKey));
		control.setUnread();
		control.markRead();

		expect(getStatus(stores)).toBe('idle');
	});
});
