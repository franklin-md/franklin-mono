import { describe, it, expect, vi } from 'vitest';
import type { MiniACPClient, TurnEnd } from '@franklin/mini-acp';
import { createCoreCompiler } from '../../compile/core/compiler.js';
import { createStoreCompiler } from '../../compile/store/compiler.js';
import { compile, combine } from '../../compile/types.js';
import { apply } from '../../api/core/middleware/apply.js';
import { createEmptyStoreResult } from '../../api/store/registry/result.js';
import { StoreRegistry } from '../../api/store/registry/index.js';
import type { Store } from '../../api/store/types.js';
import { createStatusControl } from '../status/control.js';
import { statusExtension } from '../status/extension.js';
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
	const registry = new StoreRegistry();
	const seed = createEmptyStoreResult(registry);
	const compiler = combine(createCoreCompiler(), createStoreCompiler(seed));
	return compile(compiler, statusExtension());
}

function getStatus(
	result: Awaited<ReturnType<typeof compileWithStatus>>,
): StatusState {
	return result.stores.get('status')!.store.get() as StatusState;
}

describe('statusExtension', () => {
	it('initializes the status store to idle', async () => {
		const result = await compileWithStatus();

		expect(getStatus(result)).toBe('idle');
	});

	it('moves to in-progress when a prompt is sent', async () => {
		const result = await compileWithStatus();
		const target = stubClient();
		const wrapped = apply(result.client, target);

		await collect(
			wrapped.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				},
			}),
		);

		expect(getStatus(result)).toBe('in-progress');
	});

	it('moves to unread when the turn ends', async () => {
		const result = await compileWithStatus();
		const turnEnd: TurnEnd = { type: 'turnEnd', stopReason: 'end_turn' };
		const target = stubClient({
			prompt: async function* () {
				yield turnEnd;
			},
		});
		const wrapped = apply(result.client, target);

		await collect(
			wrapped.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				},
			}),
		);

		expect(getStatus(result)).toBe('unread');
	});

	it('markRead clears unread back to idle', async () => {
		const result = await compileWithStatus();
		const entry = result.stores.get('status');
		expect(entry).toBeDefined();

		const control = createStatusControl(entry!.store as Store<StatusState>);
		control.setUnread();
		control.markRead();

		expect(getStatus(result)).toBe('idle');
	});
});
