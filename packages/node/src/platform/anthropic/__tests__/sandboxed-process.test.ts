import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { quote } from 'shell-quote';
import type {
	SandboxManager,
	SandboxRuntimeConfig,
	SandboxAskCallback,
} from '@anthropic-ai/sandbox-runtime';
import type { EnvironmentConfig } from '@franklin/agent';
import { FILESYSTEM_ALLOW_ALL, toAbsolutePath } from '@franklin/lib';
import type { SandboxedProcess as SandboxedProcessType } from '../sandboxed-process.js';
let SandboxedProcess: typeof SandboxedProcessType;

const sandbox = vi.hoisted(() => ({
	live: false,
	ask: undefined as SandboxAskCallback | undefined,
	initialize: vi.fn<typeof SandboxManager.initialize>(),
	reset: vi.fn<typeof SandboxManager.reset>(),
	wrapWithSandbox: vi.fn<typeof SandboxManager.wrapWithSandbox>(),
	cleanupAfterCommand: vi.fn<typeof SandboxManager.cleanupAfterCommand>(),
}));

vi.mock('@anthropic-ai/sandbox-runtime', () => ({ SandboxManager: sandbox }));

function createProcess(allowedDomains: string[] = []) {
	const config: EnvironmentConfig = {
		fsConfig: {
			cwd: toAbsolutePath(process.cwd()),
			permissions: FILESYSTEM_ALLOW_ALL,
		},
		netConfig: { allowedDomains, deniedDomains: [] },
	};
	return new SandboxedProcess(toAbsolutePath(process.cwd()), config);
}

beforeEach(async () => {
	vi.resetModules();
	({ SandboxedProcess } = await import('../sandboxed-process.js'));
	sandbox.live = false;
	sandbox.ask = undefined;
	sandbox.initialize.mockImplementation(
		async (_config: SandboxRuntimeConfig, ask?: SandboxAskCallback) => {
			if (sandbox.live) return;
			sandbox.live = true;
			sandbox.ask = ask;
		},
	);
	sandbox.reset.mockImplementation(async () => {
		sandbox.live = false;
		sandbox.ask = undefined;
	});
	sandbox.wrapWithSandbox.mockImplementation(async (command: string) => {
		if (!sandbox.live) throw new Error('Sandbox proxy unavailable');
		const allowed = await sandbox.ask?.({ host: 'example.com', port: 443 });
		return quote([
			'env',
			'TMPDIR=/missing franklin temp',
			`FRANKLIN_TEST_ALLOWED=${allowed ? 'yes' : 'no'}`,
			'/bin/sh',
			'-c',
			command,
		]);
	});
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('SandboxedProcess', () => {
	it('reuses the configured runtime for sequential commands', async () => {
		const proc = createProcess(['example.com']);
		await proc.initialize();
		for (let i = 0; i < 2; i++) {
			const result = await proc.exec({
				file: '/bin/sh',
				args: ['-c', 'printf %s "$FRANKLIN_TEST_ALLOWED"'],
			});
			expect(result.stdout).toBe('yes');
		}
		expect(sandbox.initialize).toHaveBeenCalledOnce();
		expect(sandbox.reset).not.toHaveBeenCalled();
	});

	it('keeps the proxy alive until overlapping commands have completed', async () => {
		const proc = createProcess(['example.com']);
		await proc.initialize();
		const slow = proc.exec({
			file: '/bin/sh',
			args: ['-c', 'sleep 0.15; printf slow'],
		});
		const fast = proc.exec({ file: '/bin/sh', args: ['-c', 'printf fast'] });
		expect((await fast).stdout).toBe('fast');
		expect(sandbox.live).toBe(true);
		expect((await slow).stdout).toBe('slow');
		expect(sandbox.live).toBe(true);
	});

	it('waits before switching the policy used by another command', async () => {
		const first = createProcess(['example.com']);
		const second = createProcess(['other.example']);
		await first.initialize();
		await second.initialize();
		const running = first.exec({
			file: '/bin/sh',
			args: ['-c', 'sleep 0.1; printf first'],
		});
		const waiting = second.exec({
			file: '/bin/sh',
			args: ['-c', 'printf %s "$FRANKLIN_TEST_ALLOWED"'],
		});
		expect((await running).stdout).toBe('first');
		expect((await waiting).stdout).toBe('no');
	});

	it('validates initial and updated policies without changing the last valid config', async () => {
		expect(() => createProcess(['example.com:443'])).toThrow('Invalid network');
		const proc = createProcess(['*']);
		await expect(
			proc.setNetworkConfig({
				allowedDomains: [],
				deniedDomains: ['https://example.com'],
			}),
		).rejects.toThrow('Invalid network');
		expect(proc.getNetworkConfig()).toEqual({
			allowedDomains: ['*'],
			deniedDomains: [],
		});
	});

	it('reconfigures future commands without changing the active policy', async () => {
		const proc = createProcess(['*']);
		let release!: () => void;
		const barrier = new Promise<void>((resolve) => {
			release = resolve;
		});
		const prepare = sandbox.wrapWithSandbox.getMockImplementation()!;
		sandbox.wrapWithSandbox.mockImplementationOnce(async (command: string) => {
			await barrier;
			return prepare(command);
		});
		const running = proc.exec({ file: 'true' });
		await vi.waitFor(() =>
			expect(sandbox.wrapWithSandbox).toHaveBeenCalledOnce(),
		);
		const ask = sandbox.ask!;
		await proc.setNetworkConfig({ allowedDomains: [], deniedDomains: [] });
		const waiting = proc.exec({
			file: '/bin/sh',
			args: ['-c', 'printf %s "$FRANKLIN_TEST_ALLOWED"'],
		});
		expect(await ask({ host: 'localhost', port: 443 })).toBe(true);
		release();
		await running;
		expect((await waiting).stdout).toBe('no');
		expect(await ask({ host: 'localhost', port: 443 })).toBe(false);
		expect(sandbox.initialize).toHaveBeenCalledOnce();
	});

	it('clears proxy bypass variables and keeps native domain lists empty', async () => {
		const proc = createProcess(['*']);
		const result = await proc.exec({
			file: '/bin/sh',
			args: [
				'-c',
				'printf "%s:%s:%s" "$NO_PROXY" "$no_proxy" "$FRANKLIN_TEST_ALLOWED"',
			],
			env: { NO_PROXY: '*', no_proxy: 'localhost' },
		});
		expect(result.stdout).toBe('::yes');
		expect(sandbox.initialize.mock.calls[0]![0].network).toEqual({
			allowedDomains: [],
			deniedDomains: [],
		});
		expect(sandbox.wrapWithSandbox.mock.calls[0]![2]?.network).toEqual({
			allowedDomains: [],
			deniedDomains: [],
		});
	});

	it('restores a usable TMPDIR after SRT overrides the outer environment', async () => {
		const proc = createProcess();
		await proc.initialize();
		const result = await proc.exec({
			file: '/bin/sh',
			args: ['-c', 'test -d "$TMPDIR"'],
		});
		expect(result.exit_code).toBe(0);
	});

	it('releases the runtime after a wrapping failure', async () => {
		const proc = createProcess(['example.com']);
		await proc.initialize();
		sandbox.wrapWithSandbox.mockRejectedValueOnce(new Error('wrap failed'));
		await expect(
			proc.exec({ file: '/bin/sh', args: ['-c', 'true'] }),
		).rejects.toThrow('wrap failed');
		expect(sandbox.cleanupAfterCommand).not.toHaveBeenCalled();
		expect(sandbox.live).toBe(true);
		expect(
			(await proc.exec({ file: '/bin/sh', args: ['-c', 'printf recovered'] }))
				.stdout,
		).toBe('recovered');
	});

	it('releases ownership after spawn errors and timed-out commands', async () => {
		const proc = createProcess();
		await expect(
			proc.exec({
				file: '/bin/sh',
				cwd: '/missing-franklin-directory',
				args: ['-c', 'true'],
			}),
		).rejects.toThrow();
		expect(sandbox.live).toBe(true);
		const timed = await proc.exec({
			file: '/bin/sh',
			args: ['-c', 'exec sleep 0.1'],
			timeout: 10,
		});
		expect(timed.exit_code).not.toBe(0);
		expect(sandbox.live).toBe(true);
		expect(
			(await proc.exec({ file: '/bin/sh', args: ['-c', 'printf recovered'] }))
				.stdout,
		).toBe('recovered');
	});

	it('recovers queued commands after initialization fails', async () => {
		const proc = createProcess();
		sandbox.initialize.mockRejectedValueOnce(
			new Error('initialization failed'),
		);
		const command = { file: '/bin/sh', args: ['-c', 'printf recovered'] };
		const results = await Promise.allSettled([
			proc.exec(command),
			proc.exec(command),
		]);
		expect(results).toEqual(
			expect.arrayContaining([
				{
					status: 'rejected',
					reason: expect.objectContaining({ message: 'initialization failed' }),
				},
				{
					status: 'fulfilled',
					value: expect.objectContaining({ stdout: 'recovered' }),
				},
			]),
		);
	});
	it('resets after cleanup failure before reconfiguring the next command', async () => {
		const proc = createProcess(['*']);
		sandbox.cleanupAfterCommand.mockImplementationOnce(() => {
			throw new Error('cleanup failed');
		});
		await expect(
			proc.exec({ file: '/bin/sh', args: ['-c', 'true'] }),
		).rejects.toThrow('cleanup failed');
		await proc.setNetworkConfig({ allowedDomains: [], deniedDomains: [] });
		expect(
			(
				await proc.exec({
					file: '/bin/sh',
					args: ['-c', 'printf %s "$FRANKLIN_TEST_ALLOWED"'],
				})
			).stdout,
		).toBe('no');
		expect(sandbox.reset).toHaveBeenCalledOnce();
		expect(sandbox.initialize).toHaveBeenCalledTimes(2);
	});
	it('preserves command and cleanup errors together and resets the runtime', async () => {
		const proc = createProcess();
		const cleanupError = new Error('cleanup failed');
		sandbox.cleanupAfterCommand.mockImplementationOnce(() => {
			throw cleanupError;
		});
		await expect(
			proc.exec({ file: 'true', cwd: '/missing-franklin-directory' }),
		).rejects.toMatchObject({
			errors: [expect.objectContaining({ code: 'ENOENT' }), cleanupError],
		});
		expect(
			(await proc.exec({ file: '/bin/sh', args: ['-c', 'printf recovered'] }))
				.stdout,
		).toBe('recovered');
		expect(sandbox.reset).toHaveBeenCalledOnce();
	});
});
