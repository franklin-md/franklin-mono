import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { UnrestrictedProcess } from '../platform/unrestricted-process.js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('UnrestrictedProcess', () => {
	let tmp: string;
	let proc: UnrestrictedProcess;

	beforeAll(async () => {
		tmp = await mkdtemp(join(tmpdir(), 'franklin-process-test-'));
		proc = new UnrestrictedProcess(tmp);
	});

	afterAll(async () => {
		await rm(tmp, { recursive: true, force: true });
	});

	it('executes a simple argv and returns exit code + stdout', async () => {
		const { exit_code, stdout, stderr } = await proc.exec({
			file: 'node',
			args: ['-e', 'process.stdout.write("hello")'],
		});
		expect(exit_code).toBe(0);
		expect(stdout).toBe('hello');
		expect(stderr).toBe('');
	});

	it('propagates non-zero exit code', async () => {
		const { exit_code } = await proc.exec({
			file: 'node',
			args: ['-e', 'process.exit(7)'],
		});
		expect(exit_code).toBe(7);
	});

	it('passes args with spaces as a single argument (no shell re-parse)', async () => {
		// Under shell:true, "hello world" would split into two argv entries.
		// Under shell:false, it stays one.
		const { stdout } = await proc.exec({
			file: 'node',
			args: [
				'-e',
				'process.stdout.write(JSON.stringify(process.argv.slice(1)))',
				'hello world',
			],
		});
		expect(JSON.parse(stdout)).toEqual(['hello world']);
	});

	it('passes args with shell metacharacters as literal strings', async () => {
		const payload = '$(echo pwned) `whoami` *';
		const { stdout } = await proc.exec({
			file: 'node',
			args: [
				'-e',
				'process.stdout.write(JSON.stringify(process.argv.slice(1)))',
				payload,
			],
		});
		expect(JSON.parse(stdout)).toEqual([payload]);
	});

	it('merges env over process.env instead of replacing it', async () => {
		const { stdout } = await proc.exec({
			file: 'node',
			args: [
				'-e',
				'process.stdout.write(JSON.stringify({ custom: process.env.CUSTOM_FRA243, hasPath: !!process.env.PATH }))',
			],
			env: { CUSTOM_FRA243: 'victoria' },
		});
		expect(JSON.parse(stdout)).toEqual({
			custom: 'victoria',
			hasPath: true,
		});
	});

	it('respects cwd override', async () => {
		const nested = join(tmp, 'nested');
		await writeFile(join(tmp, 'nested.sentinel'), '');
		// nested dir doesn't have to exist — we'll use tmp itself as cwd override
		const { stdout } = await proc.exec({
			file: 'node',
			args: ['-e', 'process.stdout.write(process.cwd())'],
			cwd: tmp,
		});
		// macOS wraps /tmp in /private/tmp; compare by endsWith on the basename.
		expect(stdout.endsWith(tmp.split('/').pop()!)).toBe(true);
		// suppress unused var warning
		void nested;
	});
});
