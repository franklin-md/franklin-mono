import { spawn, type ChildProcess } from 'node:child_process';
import {
	createInterface,
	type Interface as ReadlineInterface,
} from 'node:readline';

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

// ---------------------------------------------------------------------------
// Low-level JSONL/JSON-RPC layer over a child process.
// ---------------------------------------------------------------------------

type PendingRequest = {
	resolve: (result: unknown) => void;
	reject: (error: Error) => void;
};

class JsonRpcProcess {
	private process: ChildProcess | null = null;
	private rl: ReadlineInterface | null = null;
	private nextId = 1;
	private pending = new Map<number | string, PendingRequest>();
	private disposed = false;

	private readonly command: string;
	private readonly args: string[];

	onNotification?: (method: string, params: unknown) => void;
	onServerRequest?: (
		method: string,
		id: number | string,
		params: unknown,
	) => void;
	onError?: (err: Error) => void;
	onExit?: (code: number | null, signal: string | null) => void;

	constructor(options?: CodexProcessTransportOptions) {
		this.command = options?.command ?? 'codex';
		this.args = options?.args ?? ['app-server'];
	}

	start(): void {
		if (this.process) {
			throw new Error('JsonRpcProcess already started');
		}

		this.process = spawn(this.command, this.args, {
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		this.process.on('error', (err) => {
			this.onError?.(err);
		});

		this.process.on('exit', (code, signal) => {
			this.rejectAllPending(
				new Error(
					`Process exited (code=${code ?? 'null'}, signal=${signal ?? 'none'})`,
				),
			);
			this.onExit?.(code, signal);
		});

		const stdout = this.process.stdout;
		if (!stdout) {
			throw new Error('Codex transport stdout is unavailable');
		}
		this.rl = createInterface({ input: stdout });
		this.rl.on('line', (line) => this.handleLine(line));
	}

	sendRequest(method: string, params: unknown): Promise<unknown> {
		if (!this.process?.stdin?.writable) {
			return Promise.reject(
				new Error('Transport not started or stdin not writable'),
			);
		}

		const id = this.nextId++;
		const message = JSON.stringify({ jsonrpc: '2.0', method, id, params });
		const stdin = this.process.stdin;

		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			stdin.write(message + '\n');
		});
	}

	sendResponse(id: number | string, result: unknown): void {
		if (!this.process?.stdin?.writable) {
			return;
		}
		const message = JSON.stringify({ jsonrpc: '2.0', id, result });
		this.process.stdin.write(message + '\n');
	}

	async shutdown(): Promise<void> {
		if (this.disposed) return;
		this.disposed = true;

		this.rl?.close();

		if (!this.process) return;

		const proc = this.process;
		this.process = null;

		if (proc.exitCode !== null || proc.signalCode !== null) {
			this.rejectAllPending(new Error('Transport shut down'));
			return;
		}

		return new Promise<void>((resolve) => {
			const killTimer = setTimeout(() => {
				proc.kill('SIGKILL');
			}, 3000);

			proc.on('exit', () => {
				clearTimeout(killTimer);
				this.rejectAllPending(new Error('Transport shut down'));
				resolve();
			});

			proc.kill('SIGTERM');
		});
	}

	private handleLine(line: string): void {
		const trimmed = line.trim();
		if (!trimmed) return;

		let msg: Record<string, unknown>;
		try {
			msg = JSON.parse(trimmed) as Record<string, unknown>;
		} catch {
			this.onError?.(new Error(`Invalid JSON from codex: ${trimmed}`));
			return;
		}

		const id = msg['id'] as number | string | undefined;
		const method = msg['method'] as string | undefined;

		// Response to a request we sent
		if (id !== undefined && !method) {
			const pending = this.pending.get(id);
			if (!pending) return;
			this.pending.delete(id);

			if ('error' in msg) {
				const err = msg['error'] as { code?: number; message?: string };
				pending.reject(
					new Error(
						err.message ?? `JSON-RPC error ${String(err.code ?? 'unknown')}`,
					),
				);
			} else {
				pending.resolve(msg['result']);
			}
			return;
		}

		// Server request (has method + id)
		if (method && id !== undefined) {
			this.onServerRequest?.(method, id, msg['params']);
			return;
		}

		// Notification (has method, no id)
		if (method) {
			this.onNotification?.(method, msg['params']);
			return;
		}
	}

	private rejectAllPending(error: Error): void {
		for (const [, pending] of this.pending) {
			pending.reject(error);
		}
		this.pending.clear();
	}
}

// ---------------------------------------------------------------------------
// CodexProcessTransport — implements CodexTransport over codex app-server.
// ---------------------------------------------------------------------------

export class CodexProcessTransport implements CodexTransport {
	private rpc: JsonRpcProcess | null = null;
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
			await rpc.sendRequest('initialize', initializeParams);
			this.initialized = true;
			this.onEvent({ type: 'agent.ready' });
			await rpc.sendRequest('thread/resume', threadResumeParams);
		} else {
			const { initializeParams, threadStartParams } = mapSessionStart();
			await rpc.sendRequest('initialize', initializeParams);
			this.initialized = true;
			this.onEvent({ type: 'agent.ready' });

			const result = (await rpc.sendRequest(
				'thread/start',
				threadStartParams,
			)) as { threadId?: string } | undefined;

			if (result && typeof result === 'object' && 'threadId' in result) {
				this._threadId = result.threadId as string;
			}
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
		const result = (await this.rpc.sendRequest(
			'thread/fork',
			threadForkParams,
		)) as { threadId?: string } | undefined;

		if (result && typeof result === 'object' && 'threadId' in result) {
			this._threadId = result.threadId as string;
		}

		this.onEvent({ type: 'session.forked' });
	}

	async startTurn(input: InputItem[]): Promise<void> {
		if (!this.initialized || !this.rpc) {
			throw new Error('Session not initialized');
		}
		if (!this._threadId) {
			throw new Error('No active thread');
		}

		const params = mapTurnStart(input, this._threadId);
		await this.rpc.sendRequest('turn/start', params);
	}

	async interruptTurn(): Promise<void> {
		if (!this.rpc) {
			throw new Error('Session not started');
		}
		if (!this._threadId || !this.turnId) {
			throw new Error('No active turn to interrupt');
		}

		const params = mapTurnInterrupt(this._threadId, this.turnId);
		await this.rpc.sendRequest('turn/interrupt', params);
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
	get _rpc(): JsonRpcProcess | null {
		return this.rpc;
	}

	// -- Wiring ---------------------------------------------------------------

	private createAndWireRpc(): JsonRpcProcess {
		const rpc = new JsonRpcProcess(this.options);
		this.rpc = rpc;

		rpc.onNotification = (method, params) => {
			if (method === 'thread/started') {
				const p = params as ThreadStartedParams;
				this._threadId = p.thread.id;
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
