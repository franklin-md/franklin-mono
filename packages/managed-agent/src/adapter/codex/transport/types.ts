import type {
	CodexOptions,
	Input,
	RunStreamedResult,
	ThreadOptions as CodexSdkThreadOptions,
	TurnOptions,
} from '@openai/codex-sdk';

import type { AdapterEventHandler } from '../../types.js';
import type { InputItem } from '../../../messages/input.js';

// ---------------------------------------------------------------------------
// CodexTransport — shared interface for process and direct transports.
//
// Each transport is responsible for:
//   1. Managing the connection/session lifecycle
//   2. Translating between Codex wire format and Franklin events
//   3. Emitting ManagedAgentEvents via the onEvent callback
// ---------------------------------------------------------------------------

export interface CodexTransport {
	/** The current Codex thread ID, or null before session start. */
	readonly threadId: string | null;

	/** Callback for emitting Franklin events. Set by the adapter. */
	onEvent: AdapterEventHandler;

	/**
	 * Initialize the transport and start or resume a session.
	 *
	 * @param threadId — If provided, resumes an existing thread.
	 */
	startSession(threadId?: string): Promise<void>;

	/**
	 * Fork the current thread into a new session.
	 * Not all transports support this — unsupported transports should throw.
	 */
	forkSession(): Promise<void>;

	/**
	 * Start a new turn with the given user input.
	 * Emits `item.*` and `turn.completed` events.
	 */
	startTurn(input: InputItem[]): Promise<void>;

	/** Interrupt the current turn. */
	interruptTurn(): Promise<void>;

	/**
	 * Resolve a pending permission request.
	 * Not all transports support this — unsupported transports should throw.
	 */
	resolvePermission(decision: 'allow' | 'deny'): void;

	/** Shut down the transport and release resources. */
	shutdown(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Transport option types
// ---------------------------------------------------------------------------

export interface CodexProcessTransportOptions {
	/** Discriminator for the process-backed transport. */
	kind?: 'process';
	/** Override the command to spawn (default: 'codex'). Useful for testing. */
	command?: string;
	/** Override the args (default: ['app-server']). */
	args?: string[];
}

export interface CodexDirectTransportOptions {
	/**
	 * Use the Codex SDK (`codex exec --json`) instead of the app-server
	 * JSON-RPC transport. Provides typed events and API-key based auth, but
	 * does not support approvals or session forking.
	 */
	kind: 'direct';
	/** Optional pre-built SDK client, mainly for tests. */
	codex?: CodexDirectClient;
	/** Options forwarded to `new Codex(...)` when `codex` is not provided. */
	sdkOptions?: CodexOptions;
	/** Default thread options for `startThread()` / `resumeThread()`. */
	threadOptions?: CodexSdkThreadOptions;
}

export type CodexTransportOptions =
	| CodexProcessTransportOptions
	| CodexDirectTransportOptions;

// ---------------------------------------------------------------------------
// SDK client abstractions (for testability)
// ---------------------------------------------------------------------------

export interface CodexDirectClient {
	startThread(options?: CodexSdkThreadOptions): CodexDirectThread;
	resumeThread(id: string, options?: CodexSdkThreadOptions): CodexDirectThread;
}

export interface CodexDirectThread {
	readonly id: string | null;
	runStreamed(
		input: Input,
		turnOptions?: TurnOptions,
	): Promise<RunStreamedResult>;
}
