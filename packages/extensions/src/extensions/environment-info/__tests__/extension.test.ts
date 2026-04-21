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
} from '../../../systems/core/compile/builders/system-prompt.js';
import type { EnvironmentRuntime } from '../../../systems/environment/runtime.js';
import type { ReconfigurableEnvironment } from '../../../systems/environment/api/types.js';
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

function fakeEnvironment(osInfo: MemoryOsInfo): ReconfigurableEnvironment {
	return {
		filesystem: {} as never,
		terminal: {} as never,
		web: {} as never,
		osInfo,
		config: async () => ({
			fsConfig: {
				cwd: '/Users/afv/project' as AbsolutePath,
				permissions: FILESYSTEM_ALLOW_ALL,
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		}),
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
	it('registers two systemPrompt handlers (static + dynamic)', () => {
		const handlers = collectHandlers(createEnvironmentInfoExtension());
		expect(handlers).toHaveLength(2);
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

	it('static fragment is emitted once — assembler skips it on second assemble if handler returns early', async () => {
		const osInfoSpy = vi.spyOn(MemoryOsInfo.prototype, 'getPlatform');
		const env = fakeEnvironment(new MemoryOsInfo());
		const ctx = fakeRuntime(env);
		const handlers = collectHandlers(createEnvironmentInfoExtension());
		const assembler = bindAssembler(handlers, ctx);

		await assembler.assemble();
		await assembler.assemble();

		// Static handler guards with hasLoaded → should only read osInfo once.
		expect(osInfoSpy).toHaveBeenCalledTimes(1);
		osInfoSpy.mockRestore();
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
