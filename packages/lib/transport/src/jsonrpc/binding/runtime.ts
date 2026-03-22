import type { Duplex } from '../../streams/types.js';
import { observe } from '../../streams/readable/observe.js';
import { callable } from '../../streams/writable/callable.js';

import { RpcError } from '../errors.js';
import type { AsyncEventQueue } from './event-queue.js';
import { AsyncEventQueue as Queue } from './event-queue.js';
import type {
	EventMethodNames,
	MethodName,
	NotificationMethodNames,
	RequestMethodNames,
	RpcMethods,
} from '../protocol/method-types.js';
import type { ProtocolManifest } from '../protocol/manifest.js';
import type { JsonRpcErrorPayload, JsonRpcMessage } from '../types.js';
import {
	isNotification,
	isRequest,
	isResponse,
	isStreamCancelNotification,
	isStreamUpdateNotification,
} from '../types.js';

export type RuntimeMethodKind = 'request' | 'notification' | 'event';
export type RuntimeSideManifest = Record<string, { kind: RuntimeMethodKind }>;

export interface Binding<TRemote extends RpcMethods<TRemote>> {
	remote: TRemote;
	close(): Promise<void>;
}

export interface BindPeerOptions<
	TRemote extends RpcMethods<TRemote>,
	TLocal extends RpcMethods<TLocal>,
> {
	duplex: Duplex<JsonRpcMessage>;
	remoteManifest: RuntimeSideManifest;
	localManifest: RuntimeSideManifest;
	handlers: TLocal;
}

interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
}

interface BindRuntimeState {
	send: (message: JsonRpcMessage) => void;
	pendingRequests: Map<number, PendingRequest>;
	pendingStreams: Map<number, AsyncEventQueue<unknown>>;
	activeStreams: Map<number, AsyncIterator<unknown>>;
}

function toErrorPayload(error: unknown): JsonRpcErrorPayload {
	if (error instanceof RpcError) {
		return error.toPayload();
	}
	return RpcError.internalError(
		error instanceof Error ? error.message : String(error),
	).toPayload();
}

export function toRuntimeManifest(
	manifest: RuntimeSideManifest,
): RuntimeSideManifest {
	return manifest;
}

function closePending(state: BindRuntimeState, error: Error): void {
	for (const [, pending] of state.pendingRequests) {
		pending.reject(error);
	}
	state.pendingRequests.clear();
	for (const [, queue] of state.pendingStreams) {
		queue.fail(error);
	}
	state.pendingStreams.clear();
}

function handleResponseMessage(
	state: BindRuntimeState,
	msg: JsonRpcMessage,
): boolean {
	if (!isResponse(msg)) return false;

	// Check if this completes a pending stream
	const stream = state.pendingStreams.get(msg.id);
	if (stream) {
		state.pendingStreams.delete(msg.id);
		if ('error' in msg) {
			stream.fail(
				new RpcError(msg.error.code, msg.error.message, msg.error.data),
			);
		} else {
			stream.complete();
		}
		return true;
	}

	// Otherwise check pending unary requests
	const pending = state.pendingRequests.get(msg.id);
	if (!pending) return true;
	state.pendingRequests.delete(msg.id);
	if ('error' in msg) {
		pending.reject(
			new RpcError(msg.error.code, msg.error.message, msg.error.data),
		);
	} else {
		pending.resolve(msg.result);
	}
	return true;
}

function handleStreamControlMessage(
	state: BindRuntimeState,
	msg: JsonRpcMessage,
): boolean {
	if (isStreamUpdateNotification(msg)) {
		const { requestId, ...value } = msg.params as Record<string, unknown> & {
			requestId: number;
		};
		state.pendingStreams.get(requestId)?.push(value);
		return true;
	}

	if (isStreamCancelNotification(msg)) {
		const iterator = state.activeStreams.get(msg.params.requestId);
		if (!iterator) return true;
		void iterator.return?.();
		state.activeStreams.delete(msg.params.requestId);
		return true;
	}

	return false;
}

function handleRequestMessage<TLocal extends RpcMethods<TLocal>>(
	state: BindRuntimeState,
	localManifest: RuntimeSideManifest,
	handlers: TLocal,
	msg: JsonRpcMessage,
): boolean {
	if (!isRequest(msg)) return false;

	if (localManifest[msg.method]?.kind !== 'request') {
		return false;
	}

	const handler = handlers[msg.method as keyof TLocal] as (
		params: unknown,
	) => Promise<unknown>;

	void Promise.resolve(handler(msg.params)).then(
		(result) => state.send({ jsonrpc: '2.0', id: msg.id, result }),
		(error: unknown) =>
			state.send({
				jsonrpc: '2.0',
				id: msg.id,
				error: toErrorPayload(error),
			}),
	);
	return true;
}

function handleNotificationMessage<TLocal extends RpcMethods<TLocal>>(
	localManifest: RuntimeSideManifest,
	handlers: TLocal,
	msg: JsonRpcMessage,
): boolean {
	if (!isNotification(msg)) return false;
	if (localManifest[msg.method]?.kind !== 'notification') return false;

	const handler = handlers[msg.method as keyof TLocal] as (
		params: unknown,
	) => Promise<void>;
	void Promise.resolve(handler(msg.params)).catch(() => {});
	return true;
}

function handleStreamRequest<TLocal extends RpcMethods<TLocal>>(
	state: BindRuntimeState,
	localManifest: RuntimeSideManifest,
	handlers: TLocal,
	msg: JsonRpcMessage,
): boolean {
	if (!isRequest(msg)) return false;
	if (localManifest[msg.method]?.kind !== 'event') return false;

	const requestId = msg.id;
	const handler = handlers[msg.method as keyof TLocal] as (
		params: unknown,
	) => AsyncIterable<unknown>;
	const iterator = handler(msg.params)[Symbol.asyncIterator]();
	state.activeStreams.set(requestId, iterator);

	const method = msg.method;
	void (async () => {
		try {
			for (;;) {
				const step = await iterator.next();
				if (step.done) {
					state.send({
						jsonrpc: '2.0',
						id: requestId,
						result: null,
					});
					return;
				}
				const value = step.value as Record<string, unknown>;
				state.send({
					jsonrpc: '2.0',
					method: `${method}/update`,
					params: { requestId, ...value },
				});
			}
		} catch (error: unknown) {
			state.send({
				jsonrpc: '2.0',
				id: requestId,
				error: toErrorPayload(error),
			});
		} finally {
			state.activeStreams.delete(requestId);
		}
	})();
	return true;
}

function createRemoteProxy<TRemote extends RpcMethods<TRemote>>(
	state: BindRuntimeState,
	remoteManifest: RuntimeSideManifest,
): TRemote {
	let nextId = 0;

	const remote = {} as TRemote;
	for (const method of Object.keys(remoteManifest) as Array<
		MethodName<TRemote>
	>) {
		const descriptor = remoteManifest[method];
		if (!descriptor) continue;

		if (descriptor.kind === 'request') {
			(remote[method] as TRemote[RequestMethodNames<TRemote>]) = ((
				params: unknown,
			) => {
				const id = nextId++;
				return new Promise<unknown>((resolve, reject) => {
					state.pendingRequests.set(id, { resolve, reject });
					state.send({ jsonrpc: '2.0', id, method, params });
				});
			}) as TRemote[RequestMethodNames<TRemote>];
			continue;
		}

		if (descriptor.kind === 'notification') {
			(remote[method] as TRemote[NotificationMethodNames<TRemote>]) = ((
				params: unknown,
			) => {
				state.send({ jsonrpc: '2.0', method, params });
				return Promise.resolve();
			}) as TRemote[NotificationMethodNames<TRemote>];
			continue;
		}

		// Stream (event) method: send a request, receive $/stream/next
		// notifications, completed by the response
		(remote[method] as TRemote[EventMethodNames<TRemote>]) = ((
			params: unknown,
		) => {
			const id = nextId++;
			const queue = new Queue<unknown>(() => {
				state.send({
					jsonrpc: '2.0',
					method: '$/stream/cancel',
					params: { requestId: id },
				});
				state.pendingStreams.delete(id);
			});
			state.pendingStreams.set(id, queue);
			state.send({ jsonrpc: '2.0', id, method, params });
			return queue;
		}) as unknown as TRemote[EventMethodNames<TRemote>];
	}

	return remote;
}

export function bindPeer<
	TRemote extends RpcMethods<TRemote>,
	TLocal extends RpcMethods<TLocal>,
>({
	duplex,
	remoteManifest,
	localManifest,
	handlers,
}: BindPeerOptions<TRemote, TLocal>): Binding<TRemote> {
	const state: BindRuntimeState = {
		send: callable(duplex.writable),
		pendingRequests: new Map<number, PendingRequest>(),
		pendingStreams: new Map<number, AsyncEventQueue<unknown>>(),
		activeStreams: new Map<number, AsyncIterator<unknown>>(),
	};
	const observer = observe(duplex.readable);

	observer.subscribe((msg) => {
		if (handleResponseMessage(state, msg)) return;
		if (handleStreamControlMessage(state, msg)) return;
		if (handleRequestMessage(state, localManifest, handlers, msg)) return;
		if (handleStreamRequest(state, localManifest, handlers, msg)) return;
		void handleNotificationMessage(localManifest, handlers, msg);
	});

	return {
		remote: createRemoteProxy<TRemote>(state, remoteManifest),
		async close() {
			observer.dispose();
			closePending(state, new Error('Connection closed'));
			for (const [, iterator] of state.activeStreams) {
				void iterator.return?.();
			}
			state.activeStreams.clear();
			await duplex.close();
		},
	};
}

export function manifestServer<TServer extends RpcMethods<TServer>>(
	manifest: ProtocolManifest<TServer, RpcMethods<any>>['server'],
): RuntimeSideManifest {
	return manifest;
}

export function manifestClient<TClient extends RpcMethods<TClient>>(
	manifest: ProtocolManifest<RpcMethods<any>, TClient>['client'],
): RuntimeSideManifest {
	return manifest;
}
