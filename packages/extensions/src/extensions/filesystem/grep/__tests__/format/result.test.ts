import type { ProcessOutput } from '@franklin/lib';
import { describe, expect, it } from 'vitest';
import { grepBackend } from '../../backends/grep/index.js';
import { formatGrepResult } from '../../format/result.js';
import { unavailableGrepResult } from '../../format/unavailable.js';

const backend = grepBackend();

function processOutput(overrides: Partial<ProcessOutput> = {}): ProcessOutput {
	return {
		exit_code: 0,
		stdout: '',
		stderr: '',
		...overrides,
	};
}

describe('unavailableGrepResult', () => {
	it('points callers to fallback filesystem tools', () => {
		const result = unavailableGrepResult();

		expect(result.isError).toBe(true);
		expect(result.output).toContain('grep is not available');
		expect(result.output).toContain('glob');
		expect(result.output).toContain('read_file');
	});
});

describe('formatGrepResult', () => {
	it('formats successful matches', () => {
		const result = formatGrepResult(
			processOutput({ stdout: 'src/a.ts:7:hit here' }),
			backend,
			{ pattern: 'hit' },
		);

		expect(result).toEqual({
			output: 'src/a.ts\n  7: hit here',
			isError: false,
		});
	});

	it('treats exit 1 as a successful empty result', () => {
		const result = formatGrepResult(processOutput({ exit_code: 1 }), backend, {
			pattern: 'hit',
		});

		expect(result).toEqual({
			output: 'No matches found.',
			isError: false,
		});
	});

	it('preserves partial matches when grep exits with traversal warnings', () => {
		const result = formatGrepResult(
			processOutput({
				exit_code: 2,
				stdout: 'src/a.ts:7:hit here',
				stderr: 'grep: /resolved/src/locked: Permission denied',
			}),
			backend,
			{ pattern: 'hit', path: 'src' },
		);

		expect(result.isError).toBe(false);
		expect(result.output).toContain('src/a.ts\n  7: hit here');
		expect(result.output).toContain('results may be incomplete');
		expect(result.output).toContain('Permission denied');
	});

	it('reports process failures and includes the single-path hint for path searches', () => {
		const result = formatGrepResult(
			processOutput({
				exit_code: 2,
				stderr: 'regex parse error',
			}),
			backend,
			{ pattern: 'bad[', path: 'src' },
		);

		expect(result.isError).toBe(true);
		expect(result.output).toContain('grep failed (exit 2): regex parse error');
		expect(result.output).toContain('path` accepts a single file or directory');
	});
});
