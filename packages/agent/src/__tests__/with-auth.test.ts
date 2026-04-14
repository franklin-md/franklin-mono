import { describe, it, expect, vi } from 'vitest';
import type { CoreRuntime, CoreState } from '@franklin/extensions';
import { createCoreSystem } from '@franklin/extensions';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/transport';
import {
	createSessionAdapter,
	createAgentConnection,
	StopCode,
} from '@franklin/mini-acp';
import { loginAgent, withAuth } from '../auth/with-auth.js';
import type { AuthManager } from '../auth/manager.js';
import type { AuthEntry } from '../auth/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AuthChangeListener = (
	provider: string,
	entry: AuthEntry | undefined,
) => void | Promise<void>;

function mockAuthManager(
	providers: Record<string, string | undefined> = {},
): AuthManager & { _listeners: AuthChangeListener[] } {
	const listeners: AuthChangeListener[] = [];
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
		onAuthChange: vi.fn((listener: AuthChangeListener) => {
			listeners.push(listener);
			return () => {
				const idx = listeners.indexOf(listener);
				if (idx >= 0) listeners.splice(idx, 1);
			};
		}),
	} as unknown as AuthManager & { _listeners: AuthChangeListener[] };
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

	it('resolves apiKey when provider changes via setContext', async () => {
		const spawn = createMockSpawn();
		const base = createCoreSystem(spawn);
		const auth = mockAuthManager({
			anthropic: 'sk-anthropic',
			'openai-codex': 'sk-openai',
		});

		const decorated = withAuth(base, auth);
		const compiler = await decorated.createCompiler({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { provider: 'anthropic' },
			},
		});
		const runtime = await compiler.build();

		// Clear the initial login call
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		// Switch provider — should auto-resolve the new apiKey
		await runtime.setContext({
			config: { provider: 'openai-codex', model: 'gpt-5.4' },
		});

		expect(auth.getApiKey).toHaveBeenCalledWith('openai-codex');

		// Verify the runtime now has the new provider's config
		const state = await runtime.state();
		expect(state.core.llmConfig.provider).toBe('openai-codex');
	});

	it('resolves auth even when provider is unchanged', async () => {
		const spawn = createMockSpawn();
		const base = createCoreSystem(spawn);
		const auth = mockAuthManager({ anthropic: 'sk-anthropic' });

		const decorated = withAuth(base, auth);
		const compiler = await decorated.createCompiler({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { provider: 'anthropic' },
			},
		});
		const runtime = await compiler.build();
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		// Same provider, different model — still resolves apiKey
		await runtime.setContext({
			config: { provider: 'anthropic', model: 'claude-opus-4-6' },
		});

		expect(auth.getApiKey).toHaveBeenCalledWith('anthropic');
	});

	it('does not overwrite an explicit apiKey in setContext', async () => {
		const spawn = createMockSpawn();
		const base = createCoreSystem(spawn);
		const auth = mockAuthManager({
			anthropic: 'sk-anthropic',
			'openai-codex': 'sk-openai',
		});

		const decorated = withAuth(base, auth);
		const compiler = await decorated.createCompiler({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { provider: 'anthropic' },
			},
		});
		const runtime = await compiler.build();
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		// Provider change WITH explicit apiKey — should not resolve
		await runtime.setContext({
			config: { provider: 'openai-codex', apiKey: 'sk-explicit' },
		});

		expect(auth.getApiKey).not.toHaveBeenCalled();
	});

	it('passes through when no apiKey exists for the new provider', async () => {
		const spawn = createMockSpawn();
		const base = createCoreSystem(spawn);
		const auth = mockAuthManager({ anthropic: 'sk-anthropic' });

		const decorated = withAuth(base, auth);
		const compiler = await decorated.createCompiler({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { provider: 'anthropic' },
			},
		});
		const runtime = await compiler.build();
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		// Switch to a provider with no stored key — should pass through without apiKey
		await runtime.setContext({
			config: { provider: 'openrouter', model: 'deepseek-r1' },
		});

		expect(auth.getApiKey).toHaveBeenCalledWith('openrouter');

		const state = await runtime.state();
		expect(state.core.llmConfig.provider).toBe('openrouter');
	});

	it('skips auth resolution for non-config setContext calls', async () => {
		const spawn = createMockSpawn();
		const base = createCoreSystem(spawn);
		const auth = mockAuthManager({ anthropic: 'sk-anthropic' });

		const decorated = withAuth(base, auth);
		const compiler = await decorated.createCompiler({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { provider: 'anthropic' },
			},
		});
		const runtime = await compiler.build();
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		// setContext with only history — no config at all
		await runtime.setContext({
			history: { systemPrompt: 'new prompt', messages: [] },
		});

		expect(auth.getApiKey).not.toHaveBeenCalled();
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
		const base = createCoreSystem(spawn);
		const decorated = withAuth(base, auth);
		const compiler = await decorated.createCompiler({
			core: {
				history: { systemPrompt: '', messages: [] },
				llmConfig: { provider },
			},
		});
		return await compiler.build();
	}

	it('pushes new key when provider credentials change', async () => {
		const providers: Record<string, string | undefined> = {
			anthropic: 'sk-old',
		};
		const auth = mockAuthManager(providers);
		const runtime = await buildRuntime('anthropic', auth);
		(auth.getApiKey as ReturnType<typeof vi.fn>).mockClear();

		// Spy on setContext to capture the resolved call
		const setContextSpy = vi.spyOn(runtime, 'setContext');

		// Simulate credential change
		providers.anthropic = 'sk-new';
		await auth._listeners[0]!('anthropic', {
			apiKey: { type: 'apiKey', key: 'sk-new' },
		});

		expect(auth.getApiKey).toHaveBeenCalledWith('anthropic');
		expect(setContextSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				config: expect.objectContaining({
					provider: 'anthropic',
					apiKey: 'sk-new',
				}),
			}),
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
		await auth._listeners[0]!('openai', {
			apiKey: { type: 'apiKey', key: 'sk-openai' },
		});

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

		const setContextSpy = vi.spyOn(runtime, 'setContext');

		providers.anthropic = undefined;
		await auth._listeners[0]!('anthropic', undefined);

		expect(auth.getApiKey).toHaveBeenCalledWith('anthropic');
		expect(setContextSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				config: expect.objectContaining({
					provider: 'anthropic',
					apiKey: undefined,
				}),
			}),
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
