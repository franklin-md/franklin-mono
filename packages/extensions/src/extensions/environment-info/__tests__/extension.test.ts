import { describe, expect, it, vi } from 'vitest';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import type { SystemPromptHandler } from '../../../systems/core/api/handlers.js';
import {
	bindHandlers,
	createCoreRegistrar,
	type WithContext,
} from '../../../systems/core/compile/registrar/index.js';
import {
	buildSystemPromptAssembler,
	type SystemPromptAssembler,
} from '../../../systems/core/compile/decorators/system-prompt/index.js';
import type { EnvironmentRuntime } from '../../../systems/environment/runtime.js';
import type {
	EnvironmentConfig,
	ReconfigurableEnvironment,
} from '../../../systems/environment/api/types.js';
import { createEnvironmentInfoExtension } from '../extension.js';

type RuntimeSystemPromptHandler = WithContext<
	SystemPromptHandler,
	EnvironmentRuntime
>;

function collectHandlers(
	extension: ReturnType<typeof createEnvironmentInfoExtension>,
): RuntimeSystemPromptHandler[] {
	const { api, registered } = createCoreRegistrar<EnvironmentRuntime>();
	extension(api);
	return registered.systemPrompt;
}

function defaultConfig(): EnvironmentConfig {
	return {
		fsConfig: {
			cwd: '/Users/afv/project' as AbsolutePath,
			permissions: FILESYSTEM_ALLOW_ALL,
		},
		netConfig: { allowedDomains: [], deniedDomains: [] },
	};
}

function fakeEnvironment(
	osInfo: MemoryOsInfo,
	config: () => EnvironmentConfig = defaultConfig,
): ReconfigurableEnvironment {
	return {
		filesystem: {} as never,
		process: {} as never,
		web: {} as never,
		osInfo,
		config: async () => config(),
		reconfigure: async () => {},
		dispose: async () => {},
	};
}

function fakeRuntime(env: ReconfigurableEnvironment): EnvironmentRuntime {
	return {
		environment: env,
		state: {
			get: async () => ({ env: await env.config() }),
			fork: async () => ({ env: await env.config() }),
			child: async () => ({ env: await env.config() }),
		},
		subscribe: () => () => {},
		dispose: async () => {},
	} as EnvironmentRuntime;
}

function bindAssembler(
	handlers: RuntimeSystemPromptHandler[],
	ctx: EnvironmentRuntime,
): SystemPromptAssembler {
	const boundHandlers: SystemPromptHandler[] = bindHandlers(
		handlers,
		() => ctx,
	);
	return buildSystemPromptAssembler(boundHandlers);
}

describe('createEnvironmentInfoExtension', () => {
	it('registers three systemPrompt handlers (static + permissions + date)', () => {
		const handlers = collectHandlers(createEnvironmentInfoExtension());
		expect(handlers).toHaveLength(3);
	});

	it('static fragment renders cwd + platform + shell + osVersion + homeDir', async () => {
		const osInfo = new MemoryOsInfo({
			platform: 'mac',
			osVersion: 'Darwin 24.6.0',
			shell: { path: '/bin/zsh', family: 'posix' },
			homeDir: '/Users/afv' as AbsolutePath,
		});
		const env = fakeEnvironment(osInfo);
		const ctx = fakeRuntime(env);
		const handlers = collectHandlers(
			createEnvironmentInfoExtension({
				now: () => new Date('2026-04-21T00:00:00Z'),
			}),
		);

		const assembled = await bindAssembler(handlers, ctx).assemble();

		expect(assembled).toContain('Working directory: /Users/afv/project');
		expect(assembled).toContain('Platform: mac');
		expect(assembled).toContain('Shell: /bin/zsh (posix)');
		expect(assembled).toContain('OS Version: Darwin 24.6.0');
		expect(assembled).toContain('Home directory: /Users/afv');
	});

	it('permissions fragment renders configured filesystem and network policies', async () => {
		const env = fakeEnvironment(new MemoryOsInfo(), () => ({
			fsConfig: {
				cwd: '/Users/afv/project' as AbsolutePath,
				permissions: {
					allowRead: ['Users/afv/project/src/**'],
					denyRead: ['Users/afv/project/secrets/**'],
					allowWrite: ['Users/afv/project/**'],
					denyWrite: ['Users/afv/project/.git/**'],
				},
			},
			netConfig: {
				allowedDomains: ['example.com'],
				deniedDomains: ['localhost:9229'],
			},
		}));
		const ctx = fakeRuntime(env);
		const handlers = collectHandlers(createEnvironmentInfoExtension());

		const assembled = await bindAssembler(handlers, ctx).assemble();

		expect(assembled).toContain('Configured environment permissions:');
		expect(assembled).toContain('- allowRead: Users/afv/project/src/**');
		expect(assembled).toContain('- denyRead: Users/afv/project/secrets/**');
		expect(assembled).toContain('- allowWrite: Users/afv/project/**');
		expect(assembled).toContain('- denyWrite: Users/afv/project/.git/**');
		expect(assembled).toContain('- allowedDomains: example.com');
		expect(assembled).toContain('- deniedDomains: localhost:9229');
	});

	it('dynamic fragment renders current date', async () => {
		const env = fakeEnvironment(new MemoryOsInfo());
		const ctx = fakeRuntime(env);
		const handlers = collectHandlers(
			createEnvironmentInfoExtension({
				now: () => new Date('2026-04-21T14:00:00Z'),
			}),
		);

		const assembled = await bindAssembler(handlers, ctx).assemble();

		expect(assembled).toContain("Today's date: 2026-04-21");
	});

	it('static fragment is computed once — handler is pinned via { once: true }', async () => {
		const osInfoSpy = vi.spyOn(MemoryOsInfo.prototype, 'getPlatform');
		const env = fakeEnvironment(new MemoryOsInfo());
		const ctx = fakeRuntime(env);
		const handlers = collectHandlers(createEnvironmentInfoExtension());
		const assembler = bindAssembler(handlers, ctx);

		await assembler.assemble();
		await assembler.assemble();

		// `{ once: true }` pins the slot → assembler skips the handler on the
		// second assemble, so osInfo reads happen at most once.
		expect(osInfoSpy).toHaveBeenCalledTimes(1);
		osInfoSpy.mockRestore();
	});

	it('permissions fragment reflects a new environment config on subsequent assembles', async () => {
		let allowWrite: readonly string[] = [];
		const env = fakeEnvironment(new MemoryOsInfo(), () => ({
			fsConfig: {
				cwd: '/Users/afv/project' as AbsolutePath,
				permissions: {
					allowRead: [],
					denyRead: [],
					allowWrite,
					denyWrite: [],
				},
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		}));
		const ctx = fakeRuntime(env);
		const handlers = collectHandlers(createEnvironmentInfoExtension());
		const assembler = bindAssembler(handlers, ctx);

		const first = await assembler.assemble();
		expect(first).toContain('- allowWrite: (none)');

		allowWrite = ['Users/afv/project/**'];
		const second = await assembler.assemble();
		expect(second).toContain('- allowWrite: Users/afv/project/**');
	});

	it('dynamic fragment reflects a new date on subsequent assembles', async () => {
		const env = fakeEnvironment(new MemoryOsInfo());
		const ctx = fakeRuntime(env);
		let t = 0;
		const now = () =>
			new Date(t === 0 ? '2026-04-21T00:00:00Z' : '2026-04-22T00:00:00Z');
		const handlers = collectHandlers(createEnvironmentInfoExtension({ now }));
		const assembler = bindAssembler(handlers, ctx);

		const first = await assembler.assemble();
		expect(first).toContain("Today's date: 2026-04-21");

		t = 1;
		const second = await assembler.assemble();
		expect(second).toContain("Today's date: 2026-04-22");
	});
});
