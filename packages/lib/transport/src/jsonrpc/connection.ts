import type { Duplex } from '../streams/types.js';
import { observe } from '../streams/readable/observe.js';
import { callable } from '../streams/writable/callable.js';

import { RpcError } from './errors.js';
import type { JsonRpcMessage } from './types.js';
import { isRequest, isNotification, isResponse } from './types.js';

export interface Connection {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- call-site type inference
	caller<P, R>(method: string): (params: P) => Promise<R>;
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- call-site type inference
	handle<P, R>(method: string, fn: (params: P) => Promise<R>): void;
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- call-site type inference
	notifier<P>(method: string): (params: P) => void;
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- call-site type inference
	onNotification<P>(method: string, fn: (params: P) => void): void;
	close(): Promise<void>;
}

interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
}

export function createConnection(duplex: Duplex<JsonRpcMessage>): Connection {
	const send = callable(duplex.writable);
	const observer = observe(duplex.readable);

	let nextId = 0;
	const pending = new Map<number, PendingRequest>();
	const requestHandlers = new Map<
		string,
		(params: unknown) => Promise<unknown>
	>();
	const notifHandlers = new Map<string, (params: unknown) => void>();

	observer.subscribe((msg) => {
		if (isResponse(msg)) {
			const entry = pending.get(msg.id);
			if (!entry) return;
			pending.delete(msg.id);
			if ('error' in msg) {
				entry.reject(
					new RpcError(msg.error.code, msg.error.message, msg.error.data),
				);
			} else {
				entry.resolve(msg.result);
			}
		} else if (isRequest(msg)) {
			const handler = requestHandlers.get(msg.method);
			if (!handler) {
				send({
					jsonrpc: '2.0',
					id: msg.id,
					error: RpcError.methodNotFound(msg.method).toPayload(),
				});
				return;
			}
			void handler(msg.params).then(
				(result) => send({ jsonrpc: '2.0', id: msg.id, result }),
				(err: unknown) => {
					const rpcErr =
						err instanceof RpcError
							? err
							: RpcError.internalError(
									err instanceof Error ? err.message : String(err),
								);
					send({ jsonrpc: '2.0', id: msg.id, error: rpcErr.toPayload() });
				},
			);
		} else if (isNotification(msg)) {
			notifHandlers.get(msg.method)?.(msg.params);
		}
	});

	return {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- call-site type inference
		caller<P, R>(method: string) {
			return (params: P) => {
				const id = nextId++;
				return new Promise<R>((resolve, reject) => {
					pending.set(id, {
						resolve: resolve as (value: unknown) => void,
						reject,
					});
					send({ jsonrpc: '2.0', id, method, params });
				});
			};
		},

		handle(method, fn) {
			requestHandlers.set(method, fn as (params: unknown) => Promise<unknown>);
		},

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- call-site type inference
		notifier<P>(method: string) {
			return (params: P) => {
				send({ jsonrpc: '2.0', method, params });
			};
		},

		onNotification(method, fn) {
			notifHandlers.set(method, fn as (params: unknown) => void);
		},

		async close() {
			observer.dispose();
			for (const [, entry] of pending) {
				entry.reject(new Error('Connection closed'));
			}
			pending.clear();
			await duplex.close();
		},
	};
}
