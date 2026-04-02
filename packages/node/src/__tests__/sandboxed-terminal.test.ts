import { describe, it, expect } from 'vitest';
import { SandboxedTerminal } from '../platform/sandboxed-terminal.js';

const defaultConfig = {
	fsConfig: {
		cwd: '/tmp',
		permissions: { allowRead: ['**'], allowWrite: ['**'] },
	},
	netConfig: { allowedDomains: [], deniedDomains: [] },
};

describe('SandboxedTerminal.exec', () => {
	it('runs a simple command and returns stdout', async () => {
		const terminal = new SandboxedTerminal(defaultConfig);
		const result = await terminal.exec({ cmd: 'echo hello' });

		expect(result.exit_code).toBe(0);
		expect(result.stdout.trim()).toBe('hello');
		expect(result.stderr).toBe('');
	});

	it('captures stderr', async () => {
		const terminal = new SandboxedTerminal(defaultConfig);
		const result = await terminal.exec({ cmd: 'echo error >&2' });

		expect(result.exit_code).toBe(0);
		expect(result.stderr.trim()).toBe('error');
	});

	it('returns non-zero exit code on failure', async () => {
		const terminal = new SandboxedTerminal(defaultConfig);
		const result = await terminal.exec({ cmd: 'exit 1' });

		expect(result.exit_code).toBe(1);
	});
});
