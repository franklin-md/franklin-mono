import { spawn, type ChildProcess } from 'node:child_process';
import {
	createInterface,
	type Interface as ReadlineInterface,
} from 'node:readline';

import { JSONRPCClient, type JSONRPCResponse } from 'json-rpc-2.0';

import type { JsonRpcStdioOptions } from './types.js';

// ---------------------------------------------------------------------------
// Generic JSON-RPC 2.0 over newline-delimited stdio.
//
// Layer 1 (protocol): `json-rpc-2.0` — id generation, pending-request
//   tracking, response correlation.
// Layer 2 (transport): Node child_process + readline — spawn, pipe,
//   newline-delimited framing.
//
// This class is vendor-agnostic. Codex-specific (or any other) semantics
// belong in the consumer that wires the callbacks.
// ---------------------------------------------------------------------------

export class JsonRpcStdio {
	private process: ChildProcess | null = null;
	private rl: ReadlineInterface | null = null;
	private client: JSONRPCClient | null = null;
	private disposed = false;

	private readonly command: string;
	private readonly args: string[];

	/** Called for incoming JSON-RPC notifications (method, no id). */
	onNotification?: (method: string, params: unknown) => void;

	/** Called for incoming JSON-RPC requests from the server (method + id). */
	onServerRequest?: (
		method: string,
		id: number | string,
		params: unknown,
	) => void;

	/** Called when the child process emits an error. */
	onError?: (err: Error) => void;

	/** Called when the child process exits. */
	onExit?: (code: number | null, signal: string | null) => void;

	constructor(options: JsonRpcStdioOptions) {
		this.command = options.command;
		this.args = options.args ?? [];
	}

	start(): void {
		if (this.process) {
			throw new Error('JsonRpcStdio already started');
		}

		const proc = spawn(this.command, this.args, {
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		this.process = proc;

		// json-rpc-2.0 handles id generation and pending-request tracking.
		// We just write the serialised request to stdin.
		this.client = new JSONRPCClient((request) => {
			if (!proc.stdin.writable) {
				throw new Error('Transport not started or stdin not writable');
			}
			proc.stdin.write(JSON.stringify(request) + '\n');
		});

		proc.on('error', (err) => {
			this.onError?.(err);
		});

		proc.on('exit', (code, signal) => {
			this.client?.rejectAllPendingRequests(
				`Process exited (code=${code ?? 'null'}, signal=${signal ?? 'none'})`,
			);
			this.onExit?.(code, signal);
		});

		this.rl = createInterface({ input: proc.stdout });
		this.rl.on('line', (line) => this.handleLine(line));
	}

	/** Send a JSON-RPC request and return the result. */
	request(method: string, params?: unknown): Promise<unknown> {
		if (!this.client) {
			return Promise.reject(new Error('Transport not started'));
		}
		return Promise.resolve(this.client.request(method, params as undefined));
	}

	/** Send a JSON-RPC response to a server-initiated request. */
	sendResponse(id: number | string, result: unknown): void {
		if (!this.process?.stdin?.writable) return;
		const message = JSON.stringify({ jsonrpc: '2.0', id, result });
		this.process.stdin.write(message + '\n');
	}

	async shutdown(): Promise<void> {
		if (this.disposed) return;
		this.disposed = true;

		this.rl?.close();
		this.client?.rejectAllPendingRequests('Transport shut down');

		if (!this.process) return;
		const proc = this.process;
		this.process = null;

		if (proc.exitCode !== null || proc.signalCode !== null) return;

		return new Promise<void>((resolve) => {
			const killTimer = setTimeout(() => {
				proc.kill('SIGKILL');
			}, 3000);

			proc.on('exit', () => {
				clearTimeout(killTimer);
				resolve();
			});

			proc.kill('SIGTERM');
		});
	}

	// -- Incoming message routing ----------------------------------------------

	private handleLine(line: string): void {
		const trimmed = line.trim();
		if (!trimmed) return;

		let msg: Record<string, unknown>;
		try {
			msg = JSON.parse(trimmed) as Record<string, unknown>;
		} catch {
			this.onError?.(new Error(`Invalid JSON: ${trimmed}`));
			return;
		}

		const id = msg['id'] as number | string | undefined;
		const method = msg['method'] as string | undefined;

		// Response to a request we sent — delegate to json-rpc-2.0 client.
		if (id !== undefined && !method) {
			this.client?.receive(msg as unknown as JSONRPCResponse);
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
		}
	}
}
