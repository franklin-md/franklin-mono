import {
	type AbsolutePath,
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
	type ProcessInput,
	type ProcessOutput,
} from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { createExtensionPoint } from '@franklin/extensibility';
import { createApi } from '@franklin/extensibility';
import { createRegistryView } from '@franklin/extensibility';
import { createRegistry } from '@franklin/extensibility';
import type { CoreSignature } from '../../../../modules/core/api/api.js';
import type { ToolResultEvent } from '../../../../modules/core/api/handlers.js';
import { buildSystemPromptAssembler } from '../../../../modules/core/context/system-prompt/assembler/index.js';
import { createCoreRegistry as createBoundCoreRegistry } from '../../../../modules/core/registrations/index.js';
import type { CoreRuntime } from '../../../../modules/core/runtime/index.js';
import type { ReconfigurableEnvironment } from '../../../../modules/environment/api/types.js';
import {
	createEnvironmentRuntime,
	type EnvironmentRuntime,
} from '../../../../modules/environment/runtime.js';
import { compileCoreWithEnv } from '../../../../testing/compile-ext.js';
import { grepExtension } from '../extension.js';

const coreExtensionPoint = createExtensionPoint<CoreSignature>({
	on: true,
	registerTool: true,
});

function mockEnvironment(
	exec: (input: ProcessInput) => Promise<ProcessOutput>,
): ReconfigurableEnvironment {
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
			resolve: vi.fn(async (p: string) => `/workspace/${p}` as AbsolutePath),
		},
		process: { exec: vi.fn(exec) },
		web: { fetch: vi.fn() },
		osInfo: new MemoryOsInfo(),
		config: vi.fn(async () => ({
			fsConfig: {
				cwd: '/workspace' as AbsolutePath,
				permissions: FILESYSTEM_ALLOW_ALL,
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		})),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

function fakeRuntime(env: ReconfigurableEnvironment): EnvironmentRuntime {
	return createEnvironmentRuntime(env);
}

function compileExtension(ext: ReturnType<typeof grepExtension>) {
	const { registry, writer } = createRegistry<
		CoreSignature,
		CoreRuntime & EnvironmentRuntime
	>();
	const api = createApi<CoreSignature, CoreRuntime & EnvironmentRuntime>(
		coreExtensionPoint,
		writer,
	);
	ext(api);
	return createRegistryView(registry);
}

function buildAssembler(
	ext: ReturnType<typeof grepExtension>,
	env: ReconfigurableEnvironment,
) {
	const registrations = createBoundCoreRegistry(
		compileExtension(ext),
		() => fakeRuntime(env) as CoreRuntime & EnvironmentRuntime,
	);
	return buildSystemPromptAssembler(registrations.handlersFor('systemPrompt'));
}

// rg-success answers `rg --version` with exit 0 AND streams an rg-style match
// when invoked with --json, so both the systemPrompt handler and the tool
// handler exercise a consistent "ripgrep present" world.
function ripgrepExec(): (input: ProcessInput) => Promise<ProcessOutput> {
	return async (input) => {
		if (input.file === 'rg' && input.args?.[0] === '--version') {
			return { exit_code: 0, stdout: 'ripgrep 14\n', stderr: '' };
		}
		if (input.file === 'rg') {
			const stdout = JSON.stringify({
				type: 'match',
				data: {
					path: { text: 'src/a.ts' },
					line_number: 3,
					lines: { text: 'foo\n' },
				},
			});
			return { exit_code: 0, stdout, stderr: '' };
		}
		throw new Error(`unexpected file: ${input.file}`);
	};
}

describe('grepExtension', () => {
	it('contributes the ripgrep dialect fragment when rg is detected', async () => {
		const env = mockEnvironment(ripgrepExec());
		const assembler = buildAssembler(grepExtension(), env);

		const assembled = await assembler.assemble();

		expect(assembled).toContain('ripgrep');
		expect(assembled).toContain('Rust regex');
	});

	it('contributes the "unavailable" fragment when neither binary is present', async () => {
		const env = mockEnvironment(async () => ({
			exit_code: 127,
			stdout: '',
			stderr: '',
		}));
		const assembler = buildAssembler(grepExtension(), env);

		const assembled = await assembler.assemble();

		expect(assembled).toContain('unavailable');
	});

	it('registers a `grep` tool with the expected schema', async () => {
		const env = mockEnvironment(ripgrepExec());
		const compiled = await compileCoreWithEnv(grepExtension(), env);

		expect(compiled.tools.map((t) => t.name)).toContain('grep');
	});

	it('executes ripgrep via process.exec and returns formatted matches', async () => {
		const env = mockEnvironment(ripgrepExec());
		const events: ToolResultEvent[] = [];
		const compiled = await compileCoreWithEnv((api) => {
			grepExtension()(api);
			api.on('toolResult', (event) => {
				events.push(event);
			});
		}, env);

		const result = await compiled.middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'grep-1',
					name: 'grep',
					arguments: { pattern: 'foo' },
				},
			},
			vi.fn(),
		);

		const text = result.content
			.filter((block) => block.type === 'text')
			.map((block) => block.text)
			.join('\n');
		expect(result.isError).toBeUndefined();
		expect(text).toBe('src/a.ts\n  3: foo');
		expect(events[0]?.result).toEqual({
			content: result.content,
		});
		expect(events[0]?.output).toEqual({
			status: 'success',
			text: 'src/a.ts\n  3: foo',
			matches: [{ file: 'src/a.ts', line: 3, text: 'foo' }],
			truncated: false,
		});
	});

	it('detects the backend independently for each runtime built from one extension', async () => {
		const ext = grepExtension();

		const unavailable = await compileCoreWithEnv(
			ext,
			mockEnvironment(async () => ({
				exit_code: 127,
				stdout: '',
				stderr: '',
			})),
		);

		const unavailableResult = await unavailable.middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'grep-unavailable',
					name: 'grep',
					arguments: { pattern: 'foo' },
				},
			},
			vi.fn(),
		);

		expect(unavailableResult.isError).toBe(true);

		const available = await compileCoreWithEnv(
			ext,
			mockEnvironment(ripgrepExec()),
		);
		const availableResult = await available.middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'grep-available',
					name: 'grep',
					arguments: { pattern: 'foo' },
				},
			},
			vi.fn(),
		);

		const text = availableResult.content
			.filter((block) => block.type === 'text')
			.map((block) => block.text)
			.join('\n');
		expect(availableResult.isError).toBeUndefined();
		expect(text).toBe('src/a.ts\n  3: foo');
	});

	it('returns a structured error when the backend is unavailable', async () => {
		const env = mockEnvironment(async () => ({
			exit_code: 127,
			stdout: '',
			stderr: '',
		}));
		const compiled = await compileCoreWithEnv(grepExtension(), env);

		const result = await compiled.middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'grep-2',
					name: 'grep',
					arguments: { pattern: 'foo' },
				},
			},
			vi.fn(),
		);

		expect(result.isError).toBe(true);
		const text = result.content
			.filter((block) => block.type === 'text')
			.map((block) => block.text)
			.join('\n');
		expect(text).toContain('grep is not available');
	});
});
