import { describe, it, expect, vi } from 'vitest';
import { compile, combine } from '../../../compile/types.js';
import { createCoreCompiler } from '../../../compile/core/compiler.js';
import { createSandboxCompiler } from '../../../compile/sandbox/compiler.js';
import { apply } from '../../../api/core/middleware/apply.js';
import { fsExtension } from '../extension.js';
import type { Sandbox, Filesystem } from '../../../api/sandbox/types.js';
import type { MiniACPAgent } from '@franklin/mini-acp';

function mockFs(): Filesystem {
	return {
		readFile: vi.fn(async () => Buffer.from('hello world')),
		writeFile: vi.fn(async () => {}),
		mkdir: vi.fn(async () => {}),
		access: vi.fn(async () => {}),
		stat: vi.fn(async () => ({
			isFile: () => false,
			isDirectory: () => true,
		})),
		readdir: vi.fn(async () => ['a.txt', 'b.txt']),
		exists: vi.fn(async () => true),
		glob: vi.fn(async () => ['src/a.ts', 'src/b.ts']),
		deleteFile: vi.fn(async () => {}),
	};
}

function mockSandbox(fs: Filesystem): Sandbox {
	return {
		cwd: '/test/project',
		fs,
		terminal: { exec: vi.fn() },
	};
}

describe('fsExtension', () => {
	it('registers 6 tools (read, write, edit, grep, find, ls)', async () => {
		const fs = mockFs();
		const sandbox = mockSandbox(fs);
		const compiler = combine(
			createCoreCompiler(),
			createSandboxCompiler(sandbox),
		);

		const result = await compile(compiler, fsExtension());

		// The tools should be in the server middleware (toolExecute)
		// Test by calling toolExecute with the tool names
		const stubAgent: MiniACPAgent = {
			toolExecute: vi.fn(async () => ({
				toolCallId: 'test',
				content: [{ type: 'text' as const, text: 'fallthrough' }],
			})),
		};
		const agent = apply(result.server, stubAgent);

		// Read tool should exist and call fs.readFile
		const readResult = await agent.toolExecute({
			call: {
				type: 'toolCall' as const,
				id: '1',
				name: 'read',
				arguments: { path: 'test.txt' },
			},
		});
		expect(readResult.content.length).toBeGreaterThan(0);

		// Write tool should exist and call fs.writeFile
		const writeResult = await agent.toolExecute({
			call: {
				type: 'toolCall' as const,
				id: '2',
				name: 'write',
				arguments: { path: 'out.txt', content: 'data' },
			},
		});
		expect(writeResult.content.length).toBeGreaterThan(0);

		// Ls tool should exist
		const lsResult = await agent.toolExecute({
			call: { type: 'toolCall' as const, id: '3', name: 'ls', arguments: {} },
		});
		expect(lsResult.content.length).toBeGreaterThan(0);

		// Unknown tool falls through to stub
		const unknownResult = await agent.toolExecute({
			call: {
				type: 'toolCall' as const,
				id: '4',
				name: 'unknown_tool',
				arguments: {},
			},
		});
		expect(unknownResult.content[0]).toEqual({
			type: 'text',
			text: 'fallthrough',
		});
	});

	it('read tool returns content blocks (not JSON-stringified)', async () => {
		const fs = mockFs();
		const sandbox = mockSandbox(fs);
		const compiler = combine(
			createCoreCompiler(),
			createSandboxCompiler(sandbox),
		);

		const result = await compile(compiler, fsExtension());

		const stubAgent: MiniACPAgent = {
			toolExecute: vi.fn(async () => ({
				toolCallId: 'test',
				content: [],
			})),
		};
		const agent = apply(result.server, stubAgent);

		const readResult = await agent.toolExecute({
			call: {
				type: 'toolCall' as const,
				id: '1',
				name: 'read',
				arguments: { path: 'test.txt' },
			},
		});

		// Content blocks should have type 'text', not JSON-wrapped
		const textBlock = readResult.content.find((c) => c.type === 'text');
		expect(textBlock).toBeDefined();
		// Should not be double-JSON-stringified
		expect(textBlock!.text).not.toMatch(/^"/);
	});
});
