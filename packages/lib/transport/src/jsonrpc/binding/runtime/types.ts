import type { AsyncEventQueue } from '../event-queue.js';
import type { JsonRpcMessage } from '../../types.js';

/**
 * Two-phase binding: the remote proxy is available immediately.
 * Call `bind(handlers)` to provide local handlers and start dispatching.
 */
export interface PeerBinding<TRemote, TLocal> {
	readonly remote: TRemote;
	bind(
		handlers: TLocal,
		onError?: (error: unknown) => void,
	): { close(): Promise<void> };
}

export interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
}

// --- Server-side state (handles incoming calls) ---

export interface ServerBindingState {
	send: (message: JsonRpcMessage) => void;
	onError: (error: unknown) => void;
	activeStreams: Map<number, AsyncIterator<unknown>>;
}

// --- Client-side state (makes outgoing calls) ---

export interface ClientBindingState {
	send: (message: JsonRpcMessage) => void;
	pendingRequests: Map<number, PendingRequest>;
	pendingStreams: Map<number, AsyncEventQueue<unknown>>;
}
