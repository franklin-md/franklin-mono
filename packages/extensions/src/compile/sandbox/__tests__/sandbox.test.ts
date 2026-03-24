import { describe, it, expect, vi } from 'vitest';
import { compile, combine } from '../../types.js';
import { createSandboxCompiler } from '../compiler.js';
import { createCoreCompiler } from '../../core/compiler.js';
import { createStoreCompiler } from '../../store/compiler.js';
import { createEmptyStoreResult } from '../../../api/store/registry/result.js';
import type { Sandbox } from '../../../api/sandbox/types.js';
import { StoreRegistry } from '../../../api/store/registry/index.js';

function mockSandbox(cwd = '/test'): Sandbox {
	return {
		cwd,
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
		terminal: {
			exec: vi.fn(),
		},
	};
}

describe('createSandboxCompiler', () => {
	it('build returns the sandbox in the result', async () => {
		const sandbox = mockSandbox('/my/cwd');
		const result = await compile(createSandboxCompiler(sandbox), () => {});

		expect(result.sandbox).toBe(sandbox);
		expect(result.sandbox.cwd).toBe('/my/cwd');
	});

	it('getSandbox() returns the sandbox to extensions', async () => {
		const sandbox = mockSandbox();
		let received: Sandbox | undefined;

		await compile(createSandboxCompiler(sandbox), (api) => {
			received = api.getSandbox();
		});

		expect(received).toBe(sandbox);
	});

	it('combines with core compiler', async () => {
		const sandbox = mockSandbox();
		const compiler = combine(
			createCoreCompiler(),
			createSandboxCompiler(sandbox),
		);

		const result = await compile(compiler, (api) => {
			// Extension sees both CoreAPI and SandboxAPI
			expect(api.getSandbox()).toBe(sandbox);
			api.on('initialize', () => undefined);
		});

		expect(result.sandbox).toBe(sandbox);
		expect(result.client).toBeDefined();
	});

	it('combines with core + store compilers', async () => {
		const sandbox = mockSandbox();
		const registry = new StoreRegistry();
		const seed = createEmptyStoreResult(registry);
		const compiler = combine(
			combine(createCoreCompiler(), createStoreCompiler(seed)),
			createSandboxCompiler(sandbox),
		);

		const result = await compile(compiler, (api) => {
			const full = api;
			expect(full.getSandbox()).toBe(sandbox);
			full.registerStore('test', 42);
		});

		expect(result.sandbox).toBe(sandbox);
		expect(result.stores.has('test')).toBe(true);
	});
});
