import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SandboxTask } from '../scheduler/types.js';

const sandbox = vi.hoisted(() => ({
	initialize: vi.fn(async () => {}),
	reset: vi.fn(async () => {}),
	updateConfig: vi.fn(),
}));
const execution = vi.hoisted(() => ({
	execute: vi.fn(async () => ({
		exit_code: 0,
		stdout: '',
		stderr: '',
	})),
}));
vi.mock('@anthropic-ai/sandbox-runtime', () => ({ SandboxManager: sandbox }));
vi.mock('../execute.js', () => execution);

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
});

describe('Anthropic runtime adapter', () => {
	it('updates native lists between commands without resetting the manager', async () => {
		const { sandboxScheduler } = await import('../runtime.js');
		await sandboxScheduler.schedule(task('a.example'));
		await sandboxScheduler.schedule(task('b.example'));
		expect(sandbox.initialize).toHaveBeenCalledOnce();
		expect(sandbox.updateConfig).toHaveBeenCalledWith(
			expect.objectContaining({
				network: { allowedDomains: ['b.example'], deniedDomains: [] },
			}),
		);
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
		expect(sandbox.updateConfig).not.toHaveBeenCalled();
		expect(sandbox.reset.mock.invocationCallOrder[0]).toBeLessThan(
			sandbox.initialize.mock.invocationCallOrder[1]!,
		);
		expect(sandbox.initialize.mock.invocationCallOrder[1]).toBeLessThan(
			execution.execute.mock.invocationCallOrder[1]!,
		);
	});

	it('recovers an update failure before admitting another request', async () => {
		const { sandboxScheduler } = await import('../runtime.js');
		await sandboxScheduler.schedule(task('a.example'));
		sandbox.updateConfig.mockImplementationOnce(() => {
			throw new Error('update failed');
		});
		await expect(sandboxScheduler.schedule(task('b.example'))).rejects.toThrow(
			'update failed',
		);
		await sandboxScheduler.schedule(task('c.example'));
		expect(sandbox.reset).toHaveBeenCalledOnce();
		expect(sandbox.initialize).toHaveBeenCalledTimes(2);
		expect(execution.execute).toHaveBeenCalledTimes(2);
	});
});
