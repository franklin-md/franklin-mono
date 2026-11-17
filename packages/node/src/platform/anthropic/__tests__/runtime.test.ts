import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';
import { acquireSandboxRuntime } from '../runtime.js';

const sandbox = vi.hoisted(() => ({
	initialize: vi.fn(async () => {}),
	reset: vi.fn(async () => {}),
}));
vi.mock('@anthropic-ai/sandbox-runtime', () => ({ SandboxManager: sandbox }));

const config: SandboxRuntimeConfig = {
	network: { allowedDomains: [], deniedDomains: [] },
	filesystem: { allowWrite: [], denyWrite: [], denyRead: [] },
};
const firstConfig = {
	...config,
	network: { allowedDomains: ['first.example'], deniedDomains: [] },
};
const secondConfig = {
	...config,
	network: { allowedDomains: ['second.example'], deniedDomains: [] },
};

afterEach(() => vi.clearAllMocks());

describe('sandbox runtime ownership', () => {
	it('shares compatible configurations until the final owner releases', async () => {
		const first = await acquireSandboxRuntime(firstConfig);
		const second = await acquireSandboxRuntime(firstConfig);
		expect(sandbox.initialize).toHaveBeenCalledOnce();
		await first();
		await first();
		expect(sandbox.reset).not.toHaveBeenCalled();
		await second();
		expect(sandbox.reset).toHaveBeenCalledOnce();
	});

	it('does not let a matching request bypass a queued incompatible policy', async () => {
		const first = await acquireSandboxRuntime(firstConfig);
		const order: string[] = [];
		const second = acquireSandboxRuntime(secondConfig).then((release) => {
			order.push('second');
			return release;
		});
		const third = acquireSandboxRuntime(firstConfig).then((release) => {
			order.push('third');
			return release;
		});
		await first();
		const releaseSecond = await second;
		expect(order).toEqual(['second']);
		await releaseSecond();
		const releaseThird = await third;
		expect(order).toEqual(['second', 'third']);
		await releaseThird();
		expect(sandbox.reset).toHaveBeenCalledTimes(3);
	});
});
