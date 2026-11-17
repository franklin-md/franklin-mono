import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	SandboxAskCallback,
	SandboxRuntimeConfig,
} from '@anthropic-ai/sandbox-runtime';
import type { ExecutionResult } from '../executor/types.js';
import type { SandboxTask } from '../scheduler/types.js';

const sandbox = vi.hoisted(() => ({
	initialize: vi.fn<
		(config: SandboxRuntimeConfig, ask: SandboxAskCallback) => Promise<void>
	>(async () => {}),
	reset: vi.fn(async () => {}),
}));
const execution = vi.hoisted(() => ({
	execute: vi.fn<() => Promise<ExecutionResult>>(),
}));
const success: ExecutionResult = {
	outcome: {
		status: 'fulfilled',
		value: { exit_code: 0, stdout: '', stderr: '' },
	},
	runtime: 'reusable',
};
vi.mock('@anthropic-ai/sandbox-runtime', () => ({ SandboxManager: sandbox }));
vi.mock('../executor/index.js', () => execution);

function task(domain: string): SandboxTask {
	return {
		input: { file: 'true' },
		config: {
			network: { allowedDomains: [domain], deniedDomains: [] },
			filesystem: {
				allowRead: [],
				allowWrite: [],
				denyWrite: [],
				denyRead: [],
			},
		},
	};
}

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
	execution.execute.mockResolvedValue(success);
});

describe('Anthropic runtime adapter', () => {
	it('switches the retained callback only after every active command completes', async () => {
		const { sandboxScheduler } = await import('../runtime.js');
		let finishFirst!: (result: ExecutionResult) => void;
		let finishSecond!: (result: ExecutionResult) => void;
		execution.execute.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finishFirst = resolve;
				}),
		);
		execution.execute.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finishSecond = resolve;
				}),
		);
		const first = sandboxScheduler.schedule(task('*'));
		const second = sandboxScheduler.schedule(task('*'));
		await vi.waitFor(() => expect(execution.execute).toHaveBeenCalledTimes(2));
		const [config, ask] = sandbox.initialize.mock.calls[0]!;
		expect(config.network).toEqual({ allowedDomains: [], deniedDomains: [] });
		expect(await ask({ host: 'localhost', port: 443 })).toBe(true);
		const next = task('b.example');
		const waiting = sandboxScheduler.schedule(next);
		next.config.network.allowedDomains.push('localhost');
		finishFirst(success);
		await first;
		expect(execution.execute).toHaveBeenCalledTimes(2);
		expect(await ask({ host: 'localhost', port: 443 })).toBe(true);
		finishSecond(success);
		await Promise.all([second, waiting]);
		expect(await ask({ host: 'localhost', port: 443 })).toBe(false);
		expect(await ask({ host: 'b.example', port: 443 })).toBe(true);
		expect(sandbox.initialize).toHaveBeenCalledOnce();
		expect(sandbox.reset).not.toHaveBeenCalled();
	});

	it('restarts captured infrastructure settings before executing', async () => {
		const { sandboxScheduler } = await import('../runtime.js');
		await sandboxScheduler.schedule(task('a.example'));
		const changed = task('a.example');
		changed.config.network.parentProxy = { http: 'http://localhost:8888' };
		await sandboxScheduler.schedule(changed);
		expect(sandbox.reset).toHaveBeenCalledOnce();
		expect(sandbox.initialize).toHaveBeenCalledTimes(2);
		expect(sandbox.initialize.mock.calls[1]![0].network).toEqual({
			allowedDomains: [],
			deniedDomains: [],
			parentProxy: changed.config.network.parentProxy,
		});
		expect(sandbox.initialize.mock.calls[1]![1]).toBe(
			sandbox.initialize.mock.calls[0]![1],
		);
		expect(sandbox.reset.mock.invocationCallOrder[0]).toBeLessThan(
			sandbox.initialize.mock.invocationCallOrder[1]!,
		);
		expect(sandbox.initialize.mock.invocationCallOrder[1]).toBeLessThan(
			execution.execute.mock.invocationCallOrder[1]!,
		);
	});

	it('reinitializes with the next policy after a failed infrastructure switch', async () => {
		const { sandboxScheduler } = await import('../runtime.js');
		await sandboxScheduler.schedule(task('a.example'));
		const changed = task('b.example');
		changed.config.network.parentProxy = { http: 'http://localhost:8888' };
		sandbox.initialize.mockRejectedValueOnce(new Error('initialize failed'));
		await expect(sandboxScheduler.schedule(changed)).rejects.toThrow(
			'initialize failed',
		);
		const retainedAsk = sandbox.initialize.mock.calls[0]![1];
		expect(await retainedAsk({ host: 'b.example', port: 443 })).toBe(false);
		await sandboxScheduler.schedule(task('c.example'));
		const [config, ask] = sandbox.initialize.mock.calls.at(-1)!;
		expect(config.network).toEqual({ allowedDomains: [], deniedDomains: [] });
		expect(await ask({ host: 'a.example', port: 443 })).toBe(false);
		expect(await ask({ host: 'b.example', port: 443 })).toBe(false);
		expect(await ask({ host: 'c.example', port: 443 })).toBe(true);
		expect(sandbox.reset).toHaveBeenCalledTimes(2);
		expect(sandbox.initialize).toHaveBeenCalledTimes(3);
		expect(execution.execute).toHaveBeenCalledTimes(2);
	});
});
