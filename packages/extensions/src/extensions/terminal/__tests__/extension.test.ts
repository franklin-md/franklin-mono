import { describe, expect, it, vi } from 'vitest';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import { compileCoreWithEnv } from '../../../testing/compile-ext.js';
import type { ReconfigurableEnvironment } from '../../../systems/environment/api/types.js';
import { bashExtension } from '../extension.js';

function mockEnvironment(exitCode: number, stdout = '', stderr = '') {
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
			resolve: vi.fn(),
		},
		process: {
			exec: vi.fn(async () => ({
				exit_code: exitCode,
				stdout,
				stderr,
			})),
		},
		web: { fetch: vi.fn() },
		osInfo: new MemoryOsInfo(),
		config: vi.fn(async () => ({
			fsConfig: {
				cwd: '/tmp' as AbsolutePath,
				permissions: FILESYSTEM_ALLOW_ALL,
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		})),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	} satisfies ReconfigurableEnvironment;
}

async function executeBashTool(env: ReconfigurableEnvironment) {
	const compiled = await compileCoreWithEnv(bashExtension(), env);
	return compiled.middleware.server.toolExecute(
		{
			call: {
				type: 'toolCall',
				id: 'bash-call-1',
				name: 'bash',
				arguments: { cmd: 'echo hi' },
			},
		},
		vi.fn(),
	);
}

function getResultText(result: {
	content: Array<{ type: string; text?: string }>;
}): string {
	return result.content
		.filter((block) => block.type === 'text')
		.map((block) => block.text ?? '')
		.join('\n');
}

describe('bashExtension', () => {
	it('returns a normal tool result when the command succeeds', async () => {
		const toolResult = await executeBashTool(mockEnvironment(0, 'ok', ''));

		expect(toolResult.isError).toBeUndefined();
		expect(getResultText(toolResult)).toBe(
			'EXIT_CODE:0\n\nSTDOUT:ok\n\nSTDERR:',
		);
	});

	it('returns an error tool result when the command exits non-zero', async () => {
		const toolResult = await executeBashTool(
			mockEnvironment(7, 'partial output', 'boom'),
		);

		expect(toolResult.isError).toBe(true);
		expect(getResultText(toolResult)).toContain('Command exited with code 7.');
		expect(getResultText(toolResult)).toContain('EXIT_CODE:7');
		expect(getResultText(toolResult)).toContain('STDOUT:partial output');
		expect(getResultText(toolResult)).toContain('STDERR:boom');
	});
});
