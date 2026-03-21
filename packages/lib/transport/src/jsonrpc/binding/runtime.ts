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
	isEventCancelNotification,
	isEventCompleteNotification,
	isEventErrorNotification,
	isEventNextNotification,
	isNotification,
	isRequest,
	isResponse,
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
	outgoingEvents: Map<number, AsyncEventQueue<unknown>>;
	activeIncomingEvents: Map<number, AsyncIterator<unknown>>;
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
	for (const [, queue] of state.outgoingEvents) {
		queue.fail(error);
	}
	state.outgoingEvents.clear();
}

function handleResponseMessage(
	state: BindRuntimeState,
	msg: JsonRpcMessage,
): boolean {
	if (!isResponse(msg)) return false;
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

function handleEventControlMessage(
	state: BindRuntimeState,
	msg: JsonRpcMessage,
): boolean {
	if (isEventNextNotification(msg)) {
		state.outgoingEvents.get(msg.params.callId)?.push(msg.params.value);
		return true;
	}

	if (isEventCompleteNotification(msg)) {
		state.outgoingEvents.get(msg.params.callId)?.complete();
		state.outgoingEvents.delete(msg.params.callId);
		return true;
	}

	if (isEventErrorNotification(msg)) {
		state.outgoingEvents
			.get(msg.params.callId)
			?.fail(
				new RpcError(
					msg.params.error.code,
					msg.params.error.message,
					msg.params.error.data,
				),
			);
		state.outgoingEvents.delete(msg.params.callId);
		return true;
	}

	if (isEventCancelNotification(msg)) {
		const iterator = state.activeIncomingEvents.get(msg.params.callId);
		if (!iterator) return true;
		void iterator.return?.();
		state.activeIncomingEvents.delete(msg.params.callId);
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
		state.send({
			jsonrpc: '2.0',
			id: msg.id,
			error: RpcError.methodNotFound(msg.method).toPayload(),
		});
		return true;
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

function handleEventInvocation<TLocal extends RpcMethods<TLocal>>(
	state: BindRuntimeState,
	localManifest: RuntimeSideManifest,
	handlers: TLocal,
	msg: JsonRpcMessage,
): boolean {
	if (!isNotification(msg)) return false;
	if (localManifest[msg.method]?.kind !== 'event') return false;

	const { callId, params } = msg.params as {
		callId: number;
		params: unknown;
	};
	const handler = handlers[msg.method as keyof TLocal] as (
		params: unknown,
	) => AsyncIterable<unknown>;
	const iterator = handler(params)[Symbol.asyncIterator]();
	state.activeIncomingEvents.set(callId, iterator);

	void (async () => {
		try {
			for (;;) {
				const step = await iterator.next();
				if (step.done) {
					state.send({
						jsonrpc: '2.0',
						method: '$/event/complete',
						params: { callId },
					});
					return;
				}
				state.send({
					jsonrpc: '2.0',
					method: '$/event/next',
					params: { callId, value: step.value },
				});
			}
		} catch (error: unknown) {
			state.send({
				jsonrpc: '2.0',
				method: '$/event/error',
				params: {
					callId,
					error: toErrorPayload(error),
				},
			});
		} finally {
			state.activeIncomingEvents.delete(callId);
		}
	})();
	return true;
}

function createRemoteProxy<TRemote extends RpcMethods<TRemote>>(
	state: BindRuntimeState,
	remoteManifest: RuntimeSideManifest,
): TRemote {
	let nextRequestId = 0;
	let nextEventCallId = 0;

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
				const id = nextRequestId++;
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

		(remote[method] as TRemote[EventMethodNames<TRemote>]) = ((
			params: unknown,
		) => {
			const callId = nextEventCallId++;
			const queue = new Queue<unknown>(() => {
				state.send({
					jsonrpc: '2.0',
					method: '$/event/cancel',
					params: { callId },
				});
				state.outgoingEvents.delete(callId);
			});
			state.outgoingEvents.set(callId, queue);
			state.send({
				jsonrpc: '2.0',
				method,
				params: {
					callId,
					params,
				},
			});
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
		outgoingEvents: new Map<number, AsyncEventQueue<unknown>>(),
		activeIncomingEvents: new Map<number, AsyncIterator<unknown>>(),
	};
	const observer = observe(duplex.readable);

	observer.subscribe((msg) => {
		if (handleResponseMessage(state, msg)) return;
		if (handleEventControlMessage(state, msg)) return;
		if (handleRequestMessage(state, localManifest, handlers, msg)) return;
		if (handleEventInvocation(state, localManifest, handlers, msg)) return;
		void handleNotificationMessage(localManifest, handlers, msg);
	});

	return {
		remote: createRemoteProxy<TRemote>(state, remoteManifest),
		async close() {
			observer.dispose();
			closePending(state, new Error('Connection closed'));
			for (const [, iterator] of state.activeIncomingEvents) {
				void iterator.return?.();
			}
			state.activeIncomingEvents.clear();
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
