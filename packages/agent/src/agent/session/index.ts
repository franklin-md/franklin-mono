import { CtxTracker } from '@franklin/mini-acp';
import type { Message } from '@franklin/mini-acp';
import type {
	Extension,
	CoreAPI,
	StoreAPI,
	StoreResult,
} from '@franklin/extensions';
import { createAgent } from '../create.js';
import { ctxExtension } from './ctx-extension.js';
import { DebouncedPersister } from './persist/debounced-persister.js';
import { SessionMap } from './persist/session-map.js';
import { hydrateStores } from './persist/snapshot.js';
import type { Persister } from './persist/types.js';
import type { SpawnFn, Session, SessionOptions } from './types.js';

export type { Session, SessionOptions, SpawnFn };

/**
 * Manages agent sessions — handles transport spawning, extension compilation,
 * and protocol initialization for each session lifecycle command.
 *
 * Parameterized by a spawn function (e.g., `Framework.spawn`) and a set of
 * extensions. Each session owns a CtxTracker that is shared with the tail
 * ctxExtension, keeping the agent's Ctx shadow in lock-step with protocol
 * events (setContext, prompt, update).
 *
 * When a `Persister` is provided, it is wrapped in a debounced persister
 * and sessions auto-persist on every ctx mutation via CtxTracker.onChange.
 */
export class SessionManager {
	private readonly sessions: SessionMap;

	constructor(
		private readonly spawn: SpawnFn,
		private readonly extensions: Extension<CoreAPI & StoreAPI>[],
		persister?: Persister,
	) {
		this.sessions = new SessionMap(
			persister ? new DebouncedPersister(persister) : undefined,
		);
	}

	/**
	 * Create a brand new session with no parent state.
	 */
	async new(options?: SessionOptions): Promise<Session> {
		return this.createAndInit(options);
	}

	/**
	 * Fork from an existing session — copies stores AND injects
	 * the parent's full Ctx into the new agent's context.
	 */
	async fork(sessionId: string, options?: SessionOptions): Promise<Session> {
		const parent = this.get(sessionId);
		const parentCtx = parent.tracker.get();
		const copiedStores = parent.agent.stores.copy('private');

		return this.createAndInit(
			{
				systemPrompt: options?.systemPrompt ?? parentCtx.history.systemPrompt,
			},
			copiedStores,
			parentCtx.history.messages,
		);
	}

	/**
	 * Create a child session — copies stores from parent but starts
	 * a fresh conversation (no history injection).
	 */
	async child(sessionId: string, options?: SessionOptions): Promise<Session> {
		const parent = this.get(sessionId);
		const copiedStores = parent.agent.stores.copy('private');
		return this.createAndInit(options, copiedStores);
	}

	/**
	 * Rewind a session to a given message index — truncates the
	 * shadowed Ctx and resets the agent's context in-place.
	 */
	async rewind(sessionId: string, messageIndex: number): Promise<void> {
		const session = this.get(sessionId);
		const ctx = session.tracker.get();

		await session.agent.setContext({
			ctx: {
				history: {
					systemPrompt: ctx.history.systemPrompt,
					messages: ctx.history.messages.slice(0, messageIndex),
				},
				tools: ctx.tools,
				config: ctx.config,
			},
		});
	}

	/**
	 * Retrieve a session by ID. Throws if not found.
	 */
	get(sessionId: string): Session {
		return this.sessions.get(sessionId);
	}

	/**
	 * Restore all sessions from the persister.
	 *
	 * Each snapshot is hydrated into a live session: a fresh transport
	 * is spawned, extensions are compiled with the persisted store values,
	 * and the context is replayed with the persisted history.
	 */
	async restore(): Promise<Session[]> {
		return this.sessions.restore(async (snapshot) => {
			const existingStores = hydrateStores(snapshot.stores);
			const transport = await this.spawn();
			const tracker = new CtxTracker();

			const extensions = [...this.extensions, ctxExtension(tracker)];
			const agent = await createAgent(extensions, transport, existingStores);
			await agent.initialize({});
			await agent.setContext({
				ctx: {
					history: {
						systemPrompt: snapshot.systemPrompt,
						messages: snapshot.messages,
					},
					tools: [],
					config: snapshot.config,
				},
			});

			return { agent, tracker };
		});
	}

	// -----------------------------------------------------------------------
	// Internal helpers
	// -----------------------------------------------------------------------

	private async createAndInit(
		options?: SessionOptions,
		existingStores?: StoreResult,
		messages?: Message[],
	): Promise<Session> {
		const transport = await this.spawn();
		const tracker = new CtxTracker();

		// Append ctxExtension at the tail so it sees final transformed params
		const extensions = [...this.extensions, ctxExtension(tracker)];
		const agent = await createAgent(extensions, transport, existingStores);
		await agent.initialize({});
		await agent.setContext({
			ctx: {
				history: {
					systemPrompt: options?.systemPrompt ?? '',
					messages: messages ?? [],
				},
				tools: [],
			},
		});

		return this.sessions.register(agent, tracker);
	}
}
