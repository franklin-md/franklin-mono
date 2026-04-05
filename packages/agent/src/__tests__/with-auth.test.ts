import { describe, it, expect, vi } from 'vitest';
import type { CoreRuntime, CoreState } from '@franklin/extensions';
import { createCoreSystem } from '@franklin/extensions';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/transport';
import {
	createSessionAdapter,
	createAgentConnection,
	StopCode,
} from '@franklin/mini-acp';
import { loginAgent, withAuth, syncAuth } from '../auth/with-auth.js';
import type { AuthChangeListener, IAuthManager } from '../auth/types.js';
import { SessionRegistry } from '../agent/session/registry.js';
import type { FranklinState, FranklinRuntime } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAuthManager(providers: Record<string, string> = {}): IAuthManager {
	return {
		load: vi.fn(async () => {
			const entries: Record<
				string,
				{ apiKey?: { type: 'apiKey'; key: string } }
			> = {};
			for (const p of Object.keys(providers)) {
				entries[p] = { apiKey: { type: 'apiKey', key: providers[p]! } };
			}
			return entries;
		}),
		getApiKey: vi.fn(async (provider: string) => providers[provider]),
		onAuthChange: vi.fn(() => () => {}),
	} as unknown as IAuthManager;
}

function mockCoreRuntime(): CoreRuntime {
	return {
		setContext: vi.fn(async () => {}),
		initialize: vi.fn(async () => ({})),
		prompt: vi.fn(async function* () {}),
		cancel: vi.fn(async () => {}),
		subscribe: vi.fn(() => () => {}),
		state: vi.fn(async () => ({
			core: { history: { systemPrompt: '', messages: [] }, llmConfig: {} },
		})),
		fork: vi.fn(async () => ({
			core: { history: { systemPrompt: '', messages: [] }, llmConfig: {} },
		})),
		child: vi.fn(async () => ({
			core: { history: { systemPrompt: '', messages: [] }, llmConfig: {} },
		})),
		dispose: vi.fn(async () => {}),
	} as unknown as CoreRuntime;
}

function createMockSpawn() {
	return async () => {
		const { a: clientSide, b: agentSide } = createDuplexPair<JsonRpcMessage>();

		const adapter = createSessionAdapter((_ctx) => ({
			async *prompt() {
				yield {
					type: 'turnEnd' as const,
					stopCode: StopCode.Finished,
				};
			},
			async cancel() {},
		}));
		const { bind } = createAgentConnection(agentSide);
		bind(adapter);

		return {
			...clientSide,
			dispose: async () => {
				await clientSide.close();
			},
		};
	};
}

// ---------------------------------------------------------------------------
// loginAgent
// ---------------------------------------------------------------------------

describe('loginAgent', () => {
	it('calls setContext with resolved provider and key', async () => {
		const runtime = mockCoreRuntime();
		const auth = mockAuthManager({ anthropic: 'sk-test-123' });
		const state: CoreState = {
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { provider: 'anthropic' },
			},
		};

		await loginAgent(runtime, state, auth);

		expect(runtime.setContext).toHaveBeenCalledWith({
			config: { provider: 'anthropic', apiKey: 'sk-test-123' },
		});
	});

	it('falls back to first stored provider when none specified', async () => {
		const runtime = mockCoreRuntime();
		const auth = mockAuthManager({ openai: 'sk-openai' });
		const state: CoreState = {
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: {},
			},
		};

		await loginAgent(runtime, state, auth);

		expect(runtime.setContext).toHaveBeenCalledWith({
			config: { provider: 'openai', apiKey: 'sk-openai' },
		});
	});

	it('no-ops when no providers are stored', async () => {
		const runtime = mockCoreRuntime();
		const auth = mockAuthManager({});
		const state: CoreState = {
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: {},
			},
		};

		await loginAgent(runtime, state, auth);

		expect(runtime.setContext).not.toHaveBeenCalled();
	});

	it('no-ops when provider exists but has no key', async () => {
		const runtime = mockCoreRuntime();
		const auth = mockAuthManager({});
		const state: CoreState = {
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { provider: 'anthropic' },
			},
		};

		await loginAgent(runtime, state, auth);

		expect(runtime.setContext).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// withAuth
// ---------------------------------------------------------------------------

describe('withAuth', () => {
	it('returns a system with the same emptyState', () => {
		const spawn = createMockSpawn();
		const base = createCoreSystem(spawn);
		const auth = mockAuthManager({});

		const decorated = withAuth(base, auth);

		expect(decorated.emptyState()).toEqual(base.emptyState());
	});

	it('authenticates the runtime during build', async () => {
		const spawn = createMockSpawn();
		const base = createCoreSystem(spawn);
		const auth = mockAuthManager({ anthropic: 'sk-build-test' });

		const decorated = withAuth(base, auth);
		const compiler = await decorated.createCompiler({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { provider: 'anthropic' },
			},
		});

		const runtime = await compiler.build();

		// TODO: We can't easily inspect that setContext was called on the
		// real runtime (it's behind the CtxTracker), so we just verify
		// that auth was invoked during the build step.
		expect(runtime.setContext).toBeDefined();
		expect(auth.getApiKey).toHaveBeenCalledWith('anthropic');
	});
});

// ---------------------------------------------------------------------------
// syncAuth
// ---------------------------------------------------------------------------

function mockFranklinRuntime(provider?: string): FranklinRuntime {
	return {
		setContext: vi.fn(async () => {}),
		state: vi.fn(async () => ({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { provider },
			},
			store: {},
			environment: {},
		})),
		fork: vi.fn(async () => ({
			core: { history: { systemPrompt: '', messages: [] }, llmConfig: {} },
			store: {},
			environment: {},
		})),
		child: vi.fn(async () => ({
			core: { history: { systemPrompt: '', messages: [] }, llmConfig: {} },
			store: {},
			environment: {},
		})),
		dispose: vi.fn(async () => {}),
		prompt: vi.fn(async function* () {}),
		cancel: vi.fn(async () => {}),
		subscribe: vi.fn(() => () => {}),
		initialize: vi.fn(async () => ({})),
	} as unknown as FranklinRuntime;
}

describe('syncAuth', () => {
	function setup() {
		let captured: AuthChangeListener | undefined;
		const auth = mockAuthManager();
		(auth.onAuthChange as ReturnType<typeof vi.fn>).mockImplementation(
			(listener: AuthChangeListener) => {
				captured = listener;
				return () => {};
			},
		);
		const sessions = new SessionRegistry<FranklinState, FranklinRuntime>();

		syncAuth(sessions, auth);

		function fireAuthChange(provider: string, key: string | undefined) {
			return captured!(provider, key);
		}

		return { sessions, fireAuthChange };
	}

	it('pushes new key to sessions matching the provider', async () => {
		const { sessions, fireAuthChange } = setup();
		const runtime = mockFranklinRuntime('anthropic');
		sessions.register(
			{ sessionId: 's1', runtime },
			{ sessionId: 's1', state: await runtime.state() },
		);

		await fireAuthChange('anthropic', 'sk-new');

		expect(runtime.setContext).toHaveBeenCalledWith({
			config: { provider: 'anthropic', apiKey: 'sk-new' },
		});
	});

	it('skips sessions that use a different provider', async () => {
		const { sessions, fireAuthChange } = setup();
		const runtime = mockFranklinRuntime('openai');
		sessions.register(
			{ sessionId: 's1', runtime },
			{ sessionId: 's1', state: await runtime.state() },
		);

		await fireAuthChange('anthropic', 'sk-new');

		expect(runtime.setContext).not.toHaveBeenCalled();
	});

	it('passes undefined apiKey on key revocation', async () => {
		const { sessions, fireAuthChange } = setup();
		const runtime = mockFranklinRuntime('anthropic');
		sessions.register(
			{ sessionId: 's1', runtime },
			{ sessionId: 's1', state: await runtime.state() },
		);

		await fireAuthChange('anthropic', undefined);

		expect(runtime.setContext).toHaveBeenCalledWith({
			config: { provider: 'anthropic', apiKey: undefined },
		});
	});

	it('no-ops when session list is empty', async () => {
		const { fireAuthChange } = setup();
		// Should not throw
		await fireAuthChange('anthropic', 'sk-new');
	});
});
