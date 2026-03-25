import type { AsyncEventQueue } from '../event-queue.js';
import type { JsonRpcMessage } from '../../types.js';
import type { RpcMethods } from '../../protocol/method-types.js';
import type { Duplex } from '../../../streams/types.js';

export type RuntimeMethodKind = 'request' | 'notification' | 'event';
export type RuntimeSideManifest = Record<string, { kind: RuntimeMethodKind }>;

/**
 * Two-phase binding: the remote proxy is available immediately.
 * Call `bind(handlers)` to provide local handlers and start dispatching.
 */
export interface PeerBinding<
	TRemote extends RpcMethods<TRemote>,
	TLocal extends RpcMethods<TLocal>,
> {
	readonly remote: TRemote;
	bind(
		handlers: TLocal,
		onError?: (error: unknown) => void,
	): { close(): Promise<void> };
}

export interface PeerBindingOptions {
	duplex: Duplex<JsonRpcMessage>;
	remoteManifest: RuntimeSideManifest;
	localManifest: RuntimeSideManifest;
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

// --- Binding return types for standalone use ---

export interface ServerBinding {
	handleMessage(msg: JsonRpcMessage): boolean;
	close(): void;
}

export interface ClientBinding<TRemote extends RpcMethods<TRemote>> {
	remote: TRemote;
	handleMessage(msg: JsonRpcMessage): boolean;
	close(): void;
}
