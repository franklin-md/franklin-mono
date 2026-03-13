import type { AdapterEventHandler } from '../../types.js';
import type { InputItem } from '../../../messages/input.js';
import {
	mapSessionFork,
	mapSessionResume,
	mapSessionStart,
	mapTurnInterrupt,
	mapTurnStart,
} from '../command-mapper.js';
import {
	mapNotification,
	mapServerRequest,
	type PendingApproval,
} from '../event-mapper.js';
import type { ThreadStartedParams, TurnStartedParams } from '../types.js';
import type { CodexProcessTransportOptions, CodexTransport } from './types.js';
import { JsonRpcStdio } from './lib/json-stdio/index.js';

// ---------------------------------------------------------------------------
// CodexProcessTransport — implements CodexTransport over codex app-server.
// ---------------------------------------------------------------------------

export class CodexProcessTransport implements CodexTransport {
	private rpc: JsonRpcStdio | null = null;
	private initialized = false;
	private _threadId: string | null = null;
	private turnId: string | null = null;
	private pendingApproval: PendingApproval | null = null;

	private readonly options: CodexProcessTransportOptions | undefined;

	onEvent: AdapterEventHandler = () => {};

	constructor(options?: CodexProcessTransportOptions) {
		this.options = options;
	}

	get threadId(): string | null {
		return this._threadId;
	}

	// -- CodexTransport -------------------------------------------------------

	async startSession(threadId?: string): Promise<void> {
		const rpc = this.createAndWireRpc();
		rpc.start();

		if (threadId) {
			const { initializeParams, threadResumeParams } =
				mapSessionResume(threadId);
			await rpc.request('initialize', initializeParams);
			this.initialized = true;
			const result = await rpc.request('thread/resume', threadResumeParams);

			// With experimentalApi, Codex may not send a thread/started
			// notification on resume. Fall back to the RPC response or the
			// known threadId when the notification handler hasn't fired yet.
			if (!this._threadId) {
				this._threadId = getThreadIdFromResult(result) ?? threadId;
			}
		} else {
			const { initializeParams, threadStartParams } = mapSessionStart();
			await rpc.request('initialize', initializeParams);
			this.initialized = true;

			this._threadId = getThreadIdFromResult(
				await rpc.request('thread/start', threadStartParams),
			);
		}
	}

	async forkSession(): Promise<void> {
		if (!this._threadId) {
			throw new Error('Cannot fork without a threadId');
		}
		if (!this.rpc) {
			throw new Error('Session not started');
		}

		const { threadForkParams } = mapSessionFork(this._threadId);
		this._threadId = getThreadIdFromResult(
			await this.rpc.request('thread/fork', threadForkParams),
		);
	}

	async startTurn(input: InputItem[]): Promise<void> {
		if (!this.initialized || !this.rpc) {
			throw new Error('Session not initialized');
		}
		if (!this._threadId) {
			throw new Error('No active thread');
		}

		const params = mapTurnStart(input, this._threadId);
		await this.rpc.request('turn/start', params);
	}

	async interruptTurn(): Promise<void> {
		if (!this.rpc) {
			throw new Error('Session not started');
		}
		if (!this._threadId || !this.turnId) {
			throw new Error('No active turn to interrupt');
		}

		const params = mapTurnInterrupt(this._threadId, this.turnId);
		await this.rpc.request('turn/interrupt', params);
	}

	resolvePermission(decision: 'allow' | 'deny'): void {
		if (!this.rpc || !this.pendingApproval) {
			throw new Error('No pending approval to resolve');
		}

		const codexDecision = decision === 'allow' ? 'accept' : 'decline';
		this.rpc.sendResponse(this.pendingApproval.codexRequestId, {
			decision: codexDecision,
		});
		this.pendingApproval = null;

		this.onEvent({
			type: 'permission.resolved',
			payload: { decision },
		});
	}

	async shutdown(): Promise<void> {
		if (this.rpc) {
			await this.rpc.shutdown();
			this.rpc = null;
		}
		this.initialized = false;
		this._threadId = null;
		this.turnId = null;
		this.pendingApproval = null;
	}

	// -- Internal: expose RPC for tests that need to poke at the protocol -----

	/** @internal — used by adapter tests that send raw server requests. */
	get _rpc(): JsonRpcStdio | null {
		return this.rpc;
	}

	// -- Wiring ---------------------------------------------------------------

	private createAndWireRpc(): JsonRpcStdio {
		const rpc = new JsonRpcStdio({
			command: this.options?.command ?? 'codex',
			args: this.options?.args ?? ['app-server'],
		});
		this.rpc = rpc;

		rpc.onNotification = (method, params) => {
			if (method === 'thread/started' || method === 'thread/resumed') {
				const p = params as ThreadStartedParams;
				this._threadId = p.thread.id;
				return;
			}
			if (method === 'turn/started') {
				const p = params as TurnStartedParams;
				this.turnId = p.turn.id;
			}
			if (method === 'turn/completed') {
				this.turnId = null;
			}

			const events = mapNotification(method, params);
			for (const event of events) {
				this.onEvent(event);
			}
		};

		rpc.onServerRequest = (method, id, params) => {
			const mapped = mapServerRequest(method, id, params);
			if (mapped) {
				this.pendingApproval = mapped.pendingApproval;
				this.onEvent(mapped.event);
			}
		};

		rpc.onError = (err) => {
			this.onEvent({
				type: 'error',
				error: { code: 'TRANSPORT_ERROR', message: err.message },
			});
		};

		rpc.onExit = () => {
			this.onEvent({ type: 'agent.exited' });
		};

		return rpc;
	}
}

function getThreadIdFromResult(result: unknown): string | null {
	if (!result || typeof result !== 'object') {
		return null;
	}

	if (
		'threadId' in result &&
		typeof (result as { threadId?: unknown }).threadId === 'string'
	) {
		return (result as { threadId: string }).threadId;
	}

	const thread = (result as { thread?: { id?: unknown } }).thread;
	if (thread && typeof thread.id === 'string') {
		return thread.id;
	}

	return null;
}
