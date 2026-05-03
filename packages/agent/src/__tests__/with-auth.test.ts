import { describe, it, expect, vi } from 'vitest';
import type { CoreRuntime, CoreState } from '@franklin/extensions';
import {
	coreStateHandle,
	createCoreModule,
	createRuntime,
} from '@franklin/extensions';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/lib/transport';
import {
	createSessionAdapter,
	createAgentConnection,
	StopCode,
	ZERO_USAGE,
} from '@franklin/mini-acp';
import {
	authenticateAgent,
	reconnectAgent,
	withAuth,
} from '../auth/with-auth.js';
import type { AuthManager } from '../auth/manager.js';
import type { AuthEntry } from '../auth/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AuthListener = (provider: string, entry: AuthEntry | undefined) => void;

function mockAuthManager(
	providers: Record<string, string | undefined> = {},
): AuthManager & { _listeners: AuthListener[] } {
	const listeners: AuthListener[] = [];
	return {
		_listeners: listeners,
		entries: vi.fn(() => {
			const result: Record<
				string,
				{ apiKey?: { type: 'apiKey'; key: string } }
			> = {};
			for (const p of Object.keys(providers)) {
				if (!providers[p]) continue;
				result[p] = { apiKey: { type: 'apiKey', key: providers[p] } };
			}
			return result;
		}),
		getApiKey: vi.fn(async (provider: string) => providers[provider]),
		onAuthChange: vi.fn((listener: AuthListener) => {
			listeners.push(listener);
			return () => {
				const idx = listeners.indexOf(listener);
				if (idx >= 0) listeners.splice(idx, 1);
			};
		}),
	} as unknown as AuthManager & { _listeners: AuthListener[] };
}

function mockCoreRuntime(): CoreRuntime {
	return {
		setLLMConfig: vi.fn(async () => {}),
		prompt: vi.fn(async function* () {}),
		cancel: vi.fn(async () => {}),
		subscribe: vi.fn(() => () => {}),
		dispose: vi.fn(async () => {}),
	} as unknown as CoreRuntime;
}

function createMockSpawn() {
	return async () => {
		const { a: clientSide, b: agentSide } = createDuplexPair<JsonRpcMessage>();
		const connection = createAgentConnection(agentSide);

		const adapter = createSessionAdapter(
			(_ctx) => ({
				async *prompt() {
					yield {
						type: 'turnEnd' as const,
						stopCode: StopCode.Finished,
					};
				},
				async cancel() {},
			}),
			connection.remote,
		);
		connection.bind(adapter);

		return {
			...clientSide,
			dispose: async () => {
				await clientSide.dispose();
			},
		};
	};
}

// ---------------------------------------------------------------------------
// authenticateAgent
// ---------------------------------------------------------------------------

describe('authenticateAgent', () => {
	it('calls setLLMConfig with the provider and resolved key', async () => {
		const runtime = mockCoreRuntime();
		const auth = mockAuthManager({ anthropic: 'sk-test-123' });

		await authenticateAgent(runtime, 'anthropic', auth);

		expect(runtime.setLLMConfig).toHaveBeenCalledWith({
			provider: 'anthropic',
			apiKey: 'sk-test-123',
		});
	});

	it('pushes undefined apiKey when provider has no stored key', async () => {
		const runtime = mockCoreRuntime();
		const auth = mockAuthManager({});

		await authenticateAgent(runtime, 'anthropic', auth);

		expect(runtime.setLLMConfig).toHaveBeenCalledWith({
			provider: 'anthropic',
			apiKey: undefined,
		});
	});
});

// ---------------------------------------------------------------------------
// reconnectAgent
// ---------------------------------------------------------------------------

describe('reconnectAgent', () => {
	it('authenticates using the provider from state', async () => {
		const runtime = mockCoreRuntime();
		const auth = mockAuthManager({ anthropic: 'sk-test-123' });
		const state: CoreState = {
			core: {
				messages: [],
				llmConfig: { provider: 'anthropic' },
				usage: ZERO_USAGE,
			},
		};

		await reconnectAgent(runtime, state, auth);

		expect(runtime.setLLMConfig).toHaveBeenCalledWith({
			provider: 'anthropic',
			apiKey: 'sk-test-123',
		});
	});

	it('no-ops when state has no provider', async () => {
		const runtime = mockCoreRuntime();
		const auth = mockAuthManager({ anthropic: 'sk-test-123' });
		const state: CoreState = {
			core: {
				messages: [],
				llmConfig: {},
				usage: ZERO_USAGE,
			},
		};

		await reconnectAgent(runtime, state, auth);

		expect(runtime.setLLMConfig).not.toHaveBeenCalled();
		expect(auth.getApiKey).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// withAuth
// ---------------------------------------------------------------------------

describe('withAuth', () => {
	it('returns a system with the same emptyState', () => {
		const spawn = createMockSpawn();
		const base = createCoreModule(spawn);
		const auth = mockAuthManager({});

		const decorated = withAuth(base, auth);

		expect(decorated.emptyState()).toEqual(base.emptyState());
	});

	it('authenticates the runtime during build', async () => {
		const spawn = createMockSpawn();
		const base = createCoreModule(spawn);
		const auth = mockAuthManager({ anthropic: 'sk-build-test' });

		const decorated = withAuth(base, auth);
		const runtime = await createRuntime(
			decorated,
			{
				core: {
					messages: [],
					llmConfig: { provider: 'anthropic' },
					usage: ZERO_USAGE,
				},
			},
			[],
		);

		// TODO: We can't easily inspect that setLLMConfig was called on the
		// real runtime (it's behind the CtxTracker), so we just verify
		// that auth was invoked during the build step.
		expect(runtime.setLLMConfig).toBeDefined();
		expect(auth.getApiKey).toHaveBeenCalledWith('anthropic');
	});

	it('resolves apiKey when provider changes via setLLMConfig', async () => {
		const spawn = createMockSpawn();
		const base = createCoreModule(spawn);
		const auth = mockAuthManager({
			anthropic: 'sk-anthropic',
			'openai-codex': 'sk-openai',
		});

		const decorated = withAuth(base, auth);
		const runtime = await createRuntime(
			decorated,
			{
				core: {
					messages: [],
					llmConfig: { provider: 'anthropic' },
					usage: ZERO_USAGE,
				},
			},
			[],
		);

		// Clear the initial login call
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		// Switch provider — should auto-resolve the new apiKey
		await runtime.setLLMConfig({ provider: 'openai-codex', model: 'gpt-5.4' });

		expect(auth.getApiKey).toHaveBeenCalledWith('openai-codex');

		// Verify the runtime now has the new provider's config
		const state = await coreStateHandle(runtime).get();
		expect(state.core.llmConfig.provider).toBe('openai-codex');
	});

	it('does not resolve auth when provider is unchanged', async () => {
		const spawn = createMockSpawn();
		const base = createCoreModule(spawn);
		const auth = mockAuthManager({ anthropic: 'sk-anthropic' });

		const decorated = withAuth(base, auth);
		const runtime = await createRuntime(
			decorated,
			{
				core: {
					messages: [],
					llmConfig: { provider: 'anthropic' },
					usage: ZERO_USAGE,
				},
			},
			[],
		);
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		// Same provider, different model — preserve the existing key without
		// re-authing.
		await runtime.setLLMConfig({
			provider: 'anthropic',
			model: 'claude-opus-4-6',
		});

		expect(auth.getApiKey).not.toHaveBeenCalled();
	});

	it('does not overwrite an explicit apiKey in setLLMConfig', async () => {
		const spawn = createMockSpawn();
		const base = createCoreModule(spawn);
		const auth = mockAuthManager({
			anthropic: 'sk-anthropic',
			'openai-codex': 'sk-openai',
		});

		const decorated = withAuth(base, auth);
		const runtime = await createRuntime(
			decorated,
			{
				core: {
					messages: [],
					llmConfig: { provider: 'anthropic' },
					usage: ZERO_USAGE,
				},
			},
			[],
		);
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		// Provider change WITH explicit apiKey — should not resolve
		await runtime.setLLMConfig({
			provider: 'openai-codex',
			apiKey: 'sk-explicit',
		});

		expect(auth.getApiKey).not.toHaveBeenCalled();
	});

	it('clears apiKey when no stored key exists for the new provider', async () => {
		const spawn = createMockSpawn();
		const base = createCoreModule(spawn);
		const auth = mockAuthManager({ anthropic: 'sk-anthropic' });

		const decorated = withAuth(base, auth);
		const runtime = await createRuntime(
			decorated,
			{
				core: {
					messages: [],
					llmConfig: { provider: 'anthropic' },
					usage: ZERO_USAGE,
				},
			},
			[],
		);
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		// Switch to a provider with no stored key — clear the previous provider's
		// key so prompt-time validation can raise AuthKeyNotSpecified.
		await runtime.setLLMConfig({
			provider: 'openrouter',
			model: 'deepseek-r1',
		});

		expect(auth.getApiKey).toHaveBeenCalledWith('openrouter');

		const state = await coreStateHandle(runtime).get();
		expect(state.core.llmConfig.provider).toBe('openrouter');
		expect(runtime.context().config.apiKey).toBeUndefined();
	});

	it('still applies provider/model when auth resolution throws (FRA-246)', async () => {
		// Simulates Anthropic OAuth token refresh failure: getApiKey rejects
		// synchronously. Before the fix, this blocked originalSetLLMConfig and
		// the runtime silently kept the old provider/model, so subsequent
		// reasoning toggles re-rendered the stale tracker and the UI reverted.
		const spawn = createMockSpawn();
		const base = createCoreModule(spawn);
		const auth = mockAuthManager({ 'openai-codex': 'sk-openai' });
		(auth as { getApiKey: AuthManager['getApiKey'] }).getApiKey = vi.fn(
			async (provider: string) => {
				if (provider === 'anthropic') {
					throw new Error('Anthropic OAuth refresh failed');
				}
				return 'sk-openai';
			},
		);

		const decorated = withAuth(base, auth);
		const runtime = await createRuntime(
			decorated,
			{
				core: {
					messages: [],
					llmConfig: { provider: 'openai-codex', model: 'gpt-5.4' },
					usage: ZERO_USAGE,
				},
			},
			[],
		);

		await runtime.setLLMConfig({
			provider: 'anthropic',
			model: 'claude-sonnet-4-6',
		});

		const state = await coreStateHandle(runtime).get();
		expect(state.core.llmConfig.provider).toBe('anthropic');
		expect(state.core.llmConfig.model).toBe('claude-sonnet-4-6');
		expect(runtime.context().config.apiKey).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// withAuth — live credential sync
// ---------------------------------------------------------------------------

describe('withAuth live sync', () => {
	async function buildRuntime(
		provider: string,
		auth: ReturnType<typeof mockAuthManager>,
	) {
		const spawn = createMockSpawn();
		const base = createCoreModule(spawn);
		const decorated = withAuth(base, auth);
		return createRuntime(
			decorated,
			{
				core: {
					messages: [],
					llmConfig: { provider },
					usage: ZERO_USAGE,
				},
			},
			[],
		);
	}

	it('pushes new key when provider credentials change', async () => {
		const providers: Record<string, string | undefined> = {
			anthropic: 'sk-old',
		};
		const auth = mockAuthManager(providers);
		const runtime = await buildRuntime('anthropic', auth);
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		// Spy on setLLMConfig to capture the resolved call
		const setLLMConfigSpy = vi.spyOn(runtime, 'setLLMConfig');

		// Simulate credential change
		providers.anthropic = 'sk-new';
		auth._listeners[0]!('anthropic', {
			apiKey: { type: 'apiKey', key: 'sk-new' },
		});
		await vi.waitFor(() =>
			expect(setLLMConfigSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					provider: 'anthropic',
					apiKey: 'sk-new',
				}),
			),
		);
	});

	it('ignores changes for a different provider', async () => {
		const providers: Record<string, string | undefined> = {
			anthropic: 'sk-anthropic',
		};
		const auth = mockAuthManager(providers);
		await buildRuntime('anthropic', auth);
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		// Fire change for a provider this runtime doesn't use
		providers.openai = 'sk-openai';
		auth._listeners[0]!('openai', {
			apiKey: { type: 'apiKey', key: 'sk-openai' },
		});
		await new Promise((r) => setTimeout(r, 50));

		// getApiKey should not have been called — runtime's provider doesn't match
		expect(auth.getApiKey).not.toHaveBeenCalled();
	});

	it('pushes undefined apiKey on key revocation', async () => {
		const providers: Record<string, string | undefined> = {
			anthropic: 'sk-old',
		};
		const auth = mockAuthManager(providers);
		const runtime = await buildRuntime('anthropic', auth);
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		const setLLMConfigSpy = vi.spyOn(runtime, 'setLLMConfig');

		providers.anthropic = undefined;
		auth._listeners[0]!('anthropic', undefined);
		await vi.waitFor(() =>
			expect(setLLMConfigSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					provider: 'anthropic',
					apiKey: undefined,
				}),
			),
		);
	});

	it('unsubscribes from auth changes on dispose', async () => {
		const auth = mockAuthManager({ anthropic: 'sk-test' });
		const runtime = await buildRuntime('anthropic', auth);

		expect(auth._listeners).toHaveLength(1);

		// Dispose may throw due to transport stream state in tests — that's fine.
		await runtime.dispose().catch(() => {});

		expect(auth._listeners).toHaveLength(0);
	});
});
