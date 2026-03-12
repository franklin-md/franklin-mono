import {
	Codex as DirectCodex,
	type AgentMessageItem as DirectAgentMessageItem,
	type ThreadEvent as DirectThreadEvent,
	type ThreadItem as DirectThreadItem,
} from '@openai/codex-sdk';

import type { AdapterEventHandler } from '../../types.js';
import type { InputItem } from '../../../messages/input.js';
import type {
	CodexDirectClient,
	CodexDirectThread,
	CodexDirectTransportOptions,
	CodexTransport,
} from './types.js';

// ---------------------------------------------------------------------------
// CodexDirectTransport — implements CodexTransport via the @openai/codex-sdk.
//
// Uses the SDK's streaming API (`thread.runStreamed()`). Simpler than the
// app-server process transport but does not support approvals or forking.
// Primarily useful for testing with a real API key.
// ---------------------------------------------------------------------------

export class CodexDirectTransport implements CodexTransport {
	private codex: CodexDirectClient | null = null;
	private thread: CodexDirectThread | null = null;
	private abortController: AbortController | null = null;
	private turnTask: Promise<void> | null = null;
	private turnSequence = 0;
	private turnId: string | null = null;
	private initialized = false;

	// Delta tracking for agent messages
	private startedItems = new Set<string>();
	private agentMessageTextById = new Map<string, string>();

	private readonly options: CodexDirectTransportOptions;

	onEvent: AdapterEventHandler = () => {};

	constructor(options: CodexDirectTransportOptions) {
		this.options = options;
	}

	private _threadId: string | null = null;

	get threadId(): string | null {
		return this._threadId;
	}

	// -- CodexTransport -------------------------------------------------------

	async startSession(threadId?: string): Promise<void> {
		const codex = this.getOrCreateCodex();

		if (threadId) {
			this.thread = codex.resumeThread(threadId, this.options.threadOptions);
			this._threadId = this.thread.id ?? threadId;
		} else {
			this.thread = codex.startThread(this.options.threadOptions);
			this._threadId = this.thread.id;
		}

		this.initialized = true;
		this.onEvent({ type: 'agent.ready' });
		this.onEvent({ type: 'session.started' });
	}

	async forkSession(): Promise<void> {
		throw new Error('session.fork is not supported by the Codex SDK transport');
	}

	async startTurn(input: InputItem[]): Promise<void> {
		if (!this.initialized || !this.thread) {
			throw new Error('Session not initialized');
		}
		if (this.turnTask) {
			throw new Error('A turn is already in progress');
		}

		const abortController = new AbortController();
		const turnId = `sdk-turn-${++this.turnSequence}`;
		this.abortController = abortController;
		this.turnId = turnId;

		const streamedTurn = await this.thread.runStreamed(
			input.map((item) => ({ type: 'text' as const, text: item.text })),
			{ signal: abortController.signal },
		);

		this.turnTask = this.consumeTurnEvents(
			streamedTurn.events,
			abortController,
			turnId,
		);
	}

	async interruptTurn(): Promise<void> {
		if (!this.abortController || !this.turnId) {
			throw new Error('No active turn to interrupt');
		}
		this.abortController.abort();
	}

	resolvePermission(_decision: 'allow' | 'deny'): void {
		throw new Error(
			'permission.resolve is not supported by the Codex SDK transport',
		);
	}

	async shutdown(): Promise<void> {
		if (this.abortController) {
			this.abortController.abort();
		}
		if (this.turnTask) {
			await this.turnTask.catch(() => undefined);
			this.turnTask = null;
		}
		this.abortController = null;
		this.codex = null;
		this.thread = null;
		this.startedItems.clear();
		this.agentMessageTextById.clear();
		this.initialized = false;
		this._threadId = null;
		this.turnId = null;
	}

	// -- Event consumption ----------------------------------------------------

	private async consumeTurnEvents(
		events: AsyncGenerator<DirectThreadEvent>,
		abortController: AbortController,
		turnId: string,
	): Promise<void> {
		try {
			for await (const event of events) {
				this.handleThreadEvent(event);
			}
		} catch (err) {
			if (!abortController.signal.aborted) {
				this.onEvent({
					type: 'error',
					error: {
						code: 'TRANSPORT_ERROR',
						message: err instanceof Error ? err.message : String(err),
					},
				});
			}
		} finally {
			if (this.abortController === abortController) {
				this.abortController = null;
			}
			if (this.turnId === turnId) {
				this.turnId = null;
			}
			this.turnTask = null;
			this.startedItems.clear();
			this.agentMessageTextById.clear();
		}
	}

	private handleThreadEvent(event: DirectThreadEvent): void {
		switch (event.type) {
			case 'thread.started':
				this._threadId = event.thread_id;
				return;

			case 'turn.started':
				this.onEvent({ type: 'turn.started' });
				return;

			case 'turn.completed':
				this.onEvent({ type: 'turn.completed' });
				return;

			case 'turn.failed':
				this.onEvent({
					type: 'error',
					error: { code: 'TURN_FAILED', message: event.error.message },
				});
				return;

			case 'item.started':
				this.handleThreadItem('started', event.item);
				return;

			case 'item.updated':
				this.handleThreadItem('updated', event.item);
				return;

			case 'item.completed':
				this.handleThreadItem('completed', event.item);
				return;

			case 'error':
				this.onEvent({
					type: 'error',
					error: { code: 'TRANSPORT_ERROR', message: event.message },
				});
				return;
		}
	}

	private handleThreadItem(
		stage: 'started' | 'updated' | 'completed',
		item: DirectThreadItem,
	): void {
		if (item.type === 'agent_message') {
			this.handleAgentMessage(stage, item);
			return;
		}

		if (item.type === 'error' && stage !== 'updated') {
			this.onEvent({
				type: 'error',
				error: { code: 'ITEM_ERROR', message: item.message },
			});
		}
	}

	private handleAgentMessage(
		stage: 'started' | 'updated' | 'completed',
		item: DirectAgentMessageItem,
	): void {
		if (!this.startedItems.has(item.id)) {
			this.startedItems.add(item.id);
			this.onEvent({
				type: 'item.started',
				item: { kind: 'assistant_message' },
			});
		}

		const previousText = this.agentMessageTextById.get(item.id) ?? '';
		const nextText = item.text;
		if (nextText !== previousText) {
			const textDelta = nextText.startsWith(previousText)
				? nextText.slice(previousText.length)
				: nextText;
			if (textDelta) {
				this.onEvent({
					type: 'item.delta',
					item: { kind: 'assistant_message', textDelta },
				});
			}
			this.agentMessageTextById.set(item.id, nextText);
		}

		if (stage === 'completed') {
			this.onEvent({
				type: 'item.completed',
				item: { kind: 'assistant_message', text: nextText },
			});
		}
	}

	// -- Helpers --------------------------------------------------------------

	private getOrCreateCodex(): CodexDirectClient {
		if (this.codex) return this.codex;
		this.codex = this.options.codex ?? new DirectCodex(this.options.sdkOptions);
		return this.codex;
	}
}
