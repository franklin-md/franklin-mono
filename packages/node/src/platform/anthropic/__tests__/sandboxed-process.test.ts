import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { quote } from 'shell-quote';
import type {
	SandboxAskCallback,
	SandboxRuntimeConfig,
} from '@anthropic-ai/sandbox-runtime';
import type { EnvironmentConfig } from '@franklin/agent';
import { FILESYSTEM_ALLOW_ALL, toAbsolutePath } from '@franklin/lib';
import { SandboxedProcess } from '../sandboxed-process.js';

const sandbox = vi.hoisted(() => ({
	live: false,
	config: undefined as SandboxRuntimeConfig | undefined,
	ask: undefined as SandboxAskCallback | undefined,
	initialize: vi.fn(),
	reset: vi.fn(),
	wrapWithSandbox: vi.fn(),
	cleanupAfterCommand: vi.fn(),
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

beforeEach(() => {
	sandbox.initialize.mockImplementation(
		async (config: SandboxRuntimeConfig, ask?: SandboxAskCallback) => {
			sandbox.live = true;
			sandbox.config = config;
			sandbox.ask = ask;
		},
	);
	sandbox.reset.mockImplementation(async () => {
		sandbox.live = false;
	});
	sandbox.wrapWithSandbox.mockImplementation(async (command: string) => {
		if (!sandbox.live) throw new Error('Sandbox proxy unavailable');
		const allowed =
			sandbox.config?.network.allowedDomains.includes('example.com') ||
			(await sandbox.ask?.({ host: 'example.com', port: 443 }));
		return quote([
			'env',
			'TMPDIR=/missing franklin temp',
			'NO_PROXY=localhost,127.0.0.1',
			'no_proxy=localhost,127.0.0.1',
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
	it('routes explicitly allowed loopback destinations through the policy proxy', async () => {
		const proc = createProcess(['127.0.0.1:51702']);
		const result = await proc.exec({
			file: '/bin/sh',
			args: ['-c', 'test -z "$NO_PROXY" && test -z "$no_proxy"'],
		});
		expect(result.exit_code).toBe(0);
	});
	it('allows public networking with Franklin’s empty allowlist on repeated commands', async () => {
		const proc = createProcess();
		await proc.initialize();
		for (let i = 0; i < 2; i++) {
			const result = await proc.exec({
				file: '/bin/sh',
				args: ['-c', 'printf %s "$FRANKLIN_TEST_ALLOWED"'],
			});
			expect(result.stdout).toBe('yes');
		}
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
		expect(sandbox.live).toBe(false);
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
		expect(sandbox.live).toBe(false);
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
		expect(sandbox.live).toBe(false);
		const timed = await proc.exec({
			file: '/bin/sh',
			args: ['-c', 'exec sleep 0.1'],
			timeout: 10,
		});
		expect(timed.exit_code).not.toBe(0);
		expect(sandbox.live).toBe(false);
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
		// Both calls validate TMPDIR asynchronously before acquiring the runtime;
		// either may reach initialization first under concurrent filesystem work.
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
});
