import { CtxTracker } from '@franklin/mini-acp';
import type { Message } from '@franklin/mini-acp';
import type {
	Extension,
	CoreAPI,
	StoreAPI,
	StoreResult,
} from '@franklin/extensions';
import type { Agent } from '../types.js';
import { createAgent } from '../create.js';
import { ctxExtension } from './ctx-extension.js';
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
 */
export class SessionManager {
	private sessions = new Map<string, Session>();

	constructor(
		private readonly spawn: SpawnFn,
		private readonly extensions: Extension<CoreAPI & StoreAPI>[],
	) {}

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
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}
		return session;
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

		return this.register(agent, tracker);
	}

	private register(agent: Agent, tracker: CtxTracker): Session {
		const sessionId = crypto.randomUUID();
		const session: Session = { sessionId, agent, tracker };
		this.sessions.set(sessionId, session);
		return session;
	}
}
