import {
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
	type AbsolutePath,
	type ProcessInput,
	type ProcessOutput,
} from '@franklin/lib';
import { spawnSync } from 'node:child_process';
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { ReconfigurableEnvironment } from '../../../../systems/environment/api/types.js';
import { runGrep } from '../run.js';

interface MockEnvOptions {
	exec?: (input: ProcessInput) => Promise<ProcessOutput>;
	resolve?: (path: string) => Promise<AbsolutePath>;
	cwd?: AbsolutePath;
}

function mockEnv(opts: MockEnvOptions = {}): ReconfigurableEnvironment {
	const exec =
		opts.exec ?? (async () => ({ exit_code: 0, stdout: '', stderr: '' }));
	const resolve =
		opts.resolve ?? (async (p: string) => `/resolved/${p}` as AbsolutePath);
	const cwd = opts.cwd ?? ('/workspace' as AbsolutePath);
	return {
		filesystem: {
			readFile: vi.fn(),
			writeFile: vi.fn(),
			mkdir: vi.fn(),
			access: vi.fn(),
			stat: vi.fn(),
			readdir: vi.fn(),
			exists: vi.fn(),
			glob: vi.fn(),
			deleteFile: vi.fn(),
			resolve: vi.fn(resolve),
		},
		process: { exec: vi.fn(exec) },
		web: { fetch: vi.fn() },
		osInfo: new MemoryOsInfo(),
		config: vi.fn(async () => ({
			fsConfig: { cwd, permissions: FILESYSTEM_ALLOW_ALL },
			netConfig: { allowedDomains: [], deniedDomains: [] },
		})),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

const RIPGREP = 'ripgrep' as const;
const GREP = 'grep' as const;
const NONE = 'none' as const;

async function execRealProcess(input: ProcessInput): Promise<ProcessOutput> {
	const result = spawnSync(input.file, input.args ?? [], {
		cwd: input.cwd,
		encoding: 'utf8',
		timeout: input.timeout,
	});
	if (result.error) throw result.error;
	return {
		exit_code: result.status ?? 1,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

function canExerciseGrepTraversalWarning(): boolean {
	if (process.platform === 'win32') return false;
	const version = spawnSync('grep', ['--version'], { encoding: 'utf8' });
	if (version.status !== 0) return false;

	const root = mkdtempSync(join(tmpdir(), 'franklin-grep-probe-'));
	const locked = join(root, 'locked');
	try {
		mkdirSync(locked);
		writeFileSync(join(root, 'hit.txt'), 'needle\n');
		chmodSync(locked, 0);
		const result = spawnSync(
			'grep',
			['-rEnI', '--color=never', '-e', 'needle', '--', root],
			{ encoding: 'utf8' },
		);
		return result.status === 2 && result.stdout.includes('needle');
	} catch {
		return false;
	} finally {
		try {
			chmodSync(locked, 0o700);
		} catch {
			// Directory may not have been created before setup failed.
		}
		rmSync(root, { recursive: true, force: true });
	}
}

describe('runGrep', () => {
	it('returns a friendly error when no backend is available, never calls exec', async () => {
		const env = mockEnv();

		const result = await runGrep(NONE, { pattern: 'foo' }, env);

		expect(result.isError).toBe(true);
		expect(result.output).toContain('grep is not available');
		expect(result.output).toContain('glob');
		expect(result.output).toContain('read_file');
		expect(env.process.exec).not.toHaveBeenCalled();
	});

	describe('ripgrep backend', () => {
		it('invokes rg with --json, pattern, and resolved target', async () => {
			const env = mockEnv();

			await runGrep(RIPGREP, { pattern: 'foo', path: 'src', limit: 25 }, env);

			expect(env.filesystem.resolve).toHaveBeenCalledWith('src');
			expect(env.process.exec).toHaveBeenCalledWith({
				file: 'rg',
				args: ['--json', '--color=never', '-e', 'foo', '--', '/resolved/src'],
				timeout: 10_000,
			});
		});

		it('defaults the target to cwd when path is omitted, and defaults the limit', async () => {
			const env = mockEnv({ cwd: '/work' as AbsolutePath });

			await runGrep(RIPGREP, { pattern: 'foo' }, env);

			const call = vi.mocked(env.process.exec).mock.calls[0]?.[0];
			expect(call?.args).toEqual([
				'--json',
				'--color=never',
				'-e',
				'foo',
				'--',
				'/work',
			]);
			expect(call?.args?.at(-1)).toBe('/work');
			expect(env.filesystem.resolve).not.toHaveBeenCalled();
		});

		it('adds -i for case_insensitive and --glob for include', async () => {
			const env = mockEnv();

			await runGrep(
				RIPGREP,
				{
					pattern: 'foo',
					case_insensitive: true,
					include: '*.ts',
				},
				env,
			);

			const args = vi.mocked(env.process.exec).mock.calls[0]?.[0].args ?? [];
			expect(args).toContain('-i');
			expect(args).toContain('--glob');
			expect(args[args.indexOf('--glob') + 1]).toBe('*.ts');
		});

		it('treats exit 1 as "no matches" and returns a success result', async () => {
			const env = mockEnv({
				exec: async () => ({ exit_code: 1, stdout: '', stderr: '' }),
			});

			const result = await runGrep(RIPGREP, { pattern: 'foo' }, env);

			expect(result.isError).toBe(false);
			expect(result.output).toBe('No matches found.');
		});

		it('parses matches from rg --json stdout', async () => {
			const matchLine = JSON.stringify({
				type: 'match',
				data: {
					path: { text: 'src/a.ts' },
					line_number: 7,
					lines: { text: 'const foo = 1\n' },
				},
			});
			const env = mockEnv({
				exec: async () => ({
					exit_code: 0,
					stdout: matchLine,
					stderr: '',
				}),
			});

			const result = await runGrep(RIPGREP, { pattern: 'foo' }, env);

			expect(result.isError).toBe(false);
			expect(result.output).toBe('src/a.ts\n  7: const foo = 1');
		});

		it('reports a truncation note when more than limit matches are parsed', async () => {
			const matches = [1, 2, 3]
				.map((n) =>
					JSON.stringify({
						type: 'match',
						data: {
							path: { text: 'a.ts' },
							line_number: n,
							lines: { text: `line${n}\n` },
						},
					}),
				)
				.join('\n');
			const env = mockEnv({
				exec: async () => ({ exit_code: 0, stdout: matches, stderr: '' }),
			});

			const result = await runGrep(RIPGREP, { pattern: 'x', limit: 2 }, env);

			expect(result.output).toContain(
				'(results truncated; narrow with path/include/limit)',
			);
		});

		it('returns an error result when exit code is ≥2', async () => {
			const env = mockEnv({
				exec: async () => ({
					exit_code: 2,
					stdout: '',
					stderr: 'regex parse error',
				}),
			});

			const result = await runGrep(RIPGREP, { pattern: 'bad[' }, env);

			expect(result.isError).toBe(true);
			expect(result.output).toContain('exit 2');
			expect(result.output).toContain('regex parse error');
		});

		it('rejects path arguments that look like multiple absolute paths', async () => {
			const env = mockEnv();

			const result = await runGrep(
				RIPGREP,
				{
					pattern: 'foo',
					path: '/tmp/project/src /tmp/project/docs',
				},
				env,
			);

			expect(result.isError).toBe(true);
			expect(result.output).toContain('Pass a single file or directory path');
			expect(env.process.exec).not.toHaveBeenCalled();
		});
	});

	describe('grep backend', () => {
		it('invokes POSIX grep with -rEnI and passes pattern/target via -e and --', async () => {
			const env = mockEnv();

			await runGrep(GREP, { pattern: 'foo', path: 'src' }, env);

			expect(env.process.exec).toHaveBeenCalledWith({
				file: 'grep',
				args: ['-rEnI', '--color=never', '-e', 'foo', '--', '/resolved/src'],
				timeout: 10_000,
			});
		});

		it('adds -i and --include=GLOB for optional flags', async () => {
			const env = mockEnv();

			await runGrep(
				GREP,
				{
					pattern: 'foo',
					case_insensitive: true,
					include: '*.ts',
				},
				env,
			);

			const args = vi.mocked(env.process.exec).mock.calls[0]?.[0].args ?? [];
			expect(args).toContain('-i');
			expect(args).toContain('--include=*.ts');
		});

		it('parses POSIX grep output', async () => {
			const env = mockEnv({
				exec: async () => ({
					exit_code: 0,
					stdout: 'src/a.ts:7:hit here',
					stderr: '',
				}),
			});

			const result = await runGrep(GREP, { pattern: 'hit' }, env);

			expect(result.output).toBe('src/a.ts\n  7: hit here');
		});

		it('returns partial matches when grep exits with traversal warnings', async () => {
			const env = mockEnv({
				exec: async () => ({
					exit_code: 2,
					stdout: '/resolved/src/a.ts:7:hit here',
					stderr: 'grep: /resolved/src/locked: Permission denied',
				}),
			});

			const result = await runGrep(GREP, { pattern: 'hit', path: 'src' }, env);

			expect(result.isError).toBe(false);
			expect(result.output).toContain('/resolved/src/a.ts\n  7: hit here');
			expect(result.output).toContain('results may be incomplete');
		});

		it.skipIf(!canExerciseGrepTraversalWarning())(
			'returns matches from path "." when real grep reports traversal warnings',
			async () => {
				const root = await mkdtemp(join(tmpdir(), 'franklin-grep-dot-'));
				const locked = join(root, 'locked');
				try {
					await writeFile(join(root, 'hit.txt'), 'needle\n');
					await mkdir(locked);
					await chmod(locked, 0);
					const env = mockEnv({
						cwd: root as AbsolutePath,
						exec: execRealProcess,
						resolve: async (path) => {
							if (path === '.') return root as AbsolutePath;
							return join(root, path) as AbsolutePath;
						},
					});

					const result = await runGrep(
						GREP,
						{ pattern: 'needle', path: '.' },
						env,
					);

					expect(result.isError).toBe(false);
					expect(result.output).toContain(
						`${join(root, 'hit.txt')}\n  1: needle`,
					);
					expect(result.output).toContain('results may be incomplete');
				} finally {
					await chmod(locked, 0o700).catch(() => {});
					await rm(root, { recursive: true, force: true });
				}
			},
		);
	});
});
