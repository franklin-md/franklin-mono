import { describe, it, expect, vi } from 'vitest';
import { compile, combine } from '../../../compile/types.js';
import { createCoreCompiler } from '../../../compile/core/compiler.js';
import { createSandboxCompiler } from '../../../compile/sandbox/compiler.js';
import { apply } from '../../../api/core/middleware/apply.js';
import { terminalExtension } from '../extension.js';
import type { Sandbox, Terminal } from '../../../api/sandbox/types.js';
import type { MiniACPAgent } from '@franklin/mini-acp';

function mockTerminal(): Terminal {
	return {
		exec: vi.fn(
			async (
				_command: string,
				_cwd: string,
				options: { onData: (data: Buffer) => void },
			) => {
				options.onData(Buffer.from('output line\n'));
				return { exitCode: 0 };
			},
		),
	};
}

function mockSandbox(terminal: Terminal): Sandbox {
	return {
		cwd: '/test/project',
		fs: {
			readFile: vi.fn(),
			writeFile: vi.fn(),
			mkdir: vi.fn(),
			access: vi.fn(),
			stat: vi.fn(),
			readdir: vi.fn(),
			exists: vi.fn(),
			glob: vi.fn(),
			deleteFile: vi.fn(),
		},
		terminal,
	};
}

describe('terminalExtension', () => {
	it('registers bash tool', async () => {
		const terminal = mockTerminal();
		const sandbox = mockSandbox(terminal);
		const compiler = combine(
			createCoreCompiler(),
			createSandboxCompiler(sandbox),
		);

		const result = await compile(compiler, terminalExtension());

		const stubAgent: MiniACPAgent = {
			toolExecute: vi.fn(async () => ({
				toolCallId: 'test',
				content: [{ type: 'text' as const, text: 'fallthrough' }],
			})),
		};
		const agent = apply(result.server, stubAgent);

		// Bash tool should exist and call terminal.exec
		const bashResult = await agent.toolExecute({
			call: {
				type: 'toolCall' as const,
				id: '1',
				name: 'bash',
				arguments: { command: 'echo hello' },
			},
		});
		expect(bashResult.content.length).toBeGreaterThan(0);
		expect(terminal.exec).toHaveBeenCalled();

		// Unknown tool falls through
		const unknownResult = await agent.toolExecute({
			call: {
				type: 'toolCall' as const,
				id: '2',
				name: 'unknown_tool',
				arguments: {},
			},
		});
		expect(unknownResult.content[0]).toEqual({
			type: 'text',
			text: 'fallthrough',
		});
	});

	it('bash result contains content blocks', async () => {
		const terminal = mockTerminal();
		const sandbox = mockSandbox(terminal);
		const compiler = combine(
			createCoreCompiler(),
			createSandboxCompiler(sandbox),
		);

		const result = await compile(compiler, terminalExtension());

		const stubAgent: MiniACPAgent = {
			toolExecute: vi.fn(async () => ({
				toolCallId: 'test',
				content: [],
			})),
		};
		const agent = apply(result.server, stubAgent);

		const bashResult = await agent.toolExecute({
			call: {
				type: 'toolCall' as const,
				id: '1',
				name: 'bash',
				arguments: { command: 'ls' },
			},
		});

		const textBlock = bashResult.content.find((c) => c.type === 'text');
		expect(textBlock).toBeDefined();
	});
});
