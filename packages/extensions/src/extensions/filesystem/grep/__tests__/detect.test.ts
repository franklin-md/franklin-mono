import type { Process, ProcessInput, ProcessOutput } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { detectGrepBackend } from '../detect.js';

interface Invocation {
	file: string;
	args: string[] | undefined;
	timeout: number | undefined;
}

function mockProcess(
	answers: Record<string, { exit_code: number } | 'throw'>,
): { process: Process; calls: Invocation[] } {
	const calls: Invocation[] = [];
	const exec = vi.fn(async (input: ProcessInput): Promise<ProcessOutput> => {
		calls.push({ file: input.file, args: input.args, timeout: input.timeout });
		const answer = answers[input.file];
		if (!answer) throw new Error(`unexpected file: ${input.file}`);
		if (answer === 'throw') throw new Error('spawn failed');
		return { exit_code: answer.exit_code, stdout: '', stderr: '' };
	});
	return { process: { exec }, calls };
}

describe('detectGrepBackend', () => {
	it('returns ripgrep when `rg --version` exits 0', async () => {
		const { process, calls } = mockProcess({ rg: { exit_code: 0 } });

		await expect(detectGrepBackend(process)).resolves.toBe('ripgrep');
		expect(calls).toEqual([{ file: 'rg', args: ['--version'], timeout: 2000 }]);
	});

	it('falls back to grep when rg is absent but grep works', async () => {
		const { process, calls } = mockProcess({
			rg: 'throw',
			grep: { exit_code: 0 },
		});

		await expect(detectGrepBackend(process)).resolves.toBe('grep');
		expect(calls.map((c) => c.file)).toEqual(['rg', 'grep']);
	});

	it('falls back to grep when rg exits non-zero', async () => {
		const { process } = mockProcess({
			rg: { exit_code: 127 },
			grep: { exit_code: 0 },
		});

		await expect(detectGrepBackend(process)).resolves.toBe('grep');
	});

	it('returns none when both binaries are missing', async () => {
		const { process } = mockProcess({ rg: 'throw', grep: 'throw' });

		await expect(detectGrepBackend(process)).resolves.toBe('none');
	});

	it('returns none when both exit non-zero', async () => {
		const { process } = mockProcess({
			rg: { exit_code: 127 },
			grep: { exit_code: 127 },
		});

		await expect(detectGrepBackend(process)).resolves.toBe('none');
	});
});
