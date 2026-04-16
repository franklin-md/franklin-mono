import type {
	ServerRuntime as IServerRuntime,
	MethodHandler,
	NotificationHandler,
	EventHandler,
} from '../../../../../proxy/index.js';
import type { JsonRpcMessage } from '../../../types.js';
import {
	isRequest,
	isNotification,
	isStreamCancelNotification,
} from '../../../types.js';
import type { ServerBindingState } from '../types.js';
import { toErrorPayload } from '../util.js';

type RegisteredHandler =
	| { kind: 'request'; handler: MethodHandler }
	| { kind: 'notification'; handler: NotificationHandler }
	| { kind: 'event'; handler: EventHandler };

export class JsonRpcServerRuntime implements IServerRuntime {
	private readonly state: ServerBindingState;
	private readonly handlers: Map<string, RegisteredHandler>;
	private readonly prefix: string;

	constructor(
		send: (message: JsonRpcMessage) => void,
		onError: (error: unknown) => void,
		prefix?: string,
		handlers?: Map<string, RegisteredHandler>,
	) {
		this.prefix = prefix ?? '';
		this.handlers = handlers ?? new Map();
		this.state = {
			send,
			onError,
			activeStreams: new Map(),
		};
	}

	registerNamespace(key: string): IServerRuntime {
		const childPrefix = this.prefix ? `${this.prefix}/${key}` : key;
		return new JsonRpcServerRuntime(
			this.state.send,
			this.state.onError,
			childPrefix,
			this.handlers,
		);
	}

	registerMethod(handler: MethodHandler): () => void {
		const name = this.prefix;
		this.handlers.set(name, { kind: 'request', handler });
		return () => {
			this.handlers.delete(name);
		};
	}

	registerNotification(handler: NotificationHandler): () => void {
		const name = this.prefix;
		this.handlers.set(name, { kind: 'notification', handler });
		return () => {
			this.handlers.delete(name);
		};
	}

	registerEvent(handler: EventHandler): () => void {
		const name = this.prefix;
		this.handlers.set(name, { kind: 'event', handler });
		return () => {
			this.handlers.delete(name);
		};
	}

	handleMessage(msg: JsonRpcMessage): boolean {
		// Stream cancel is handler-independent
		if (isStreamCancelNotification(msg)) {
			const iterator = this.state.activeStreams.get(msg.params.requestId);
			if (!iterator) return true;
			void iterator.return?.();
			this.state.activeStreams.delete(msg.params.requestId);
			return true;
		}

		if (isRequest(msg)) {
			const registered = this.handlers.get(msg.method);
			if (!registered) return false;

			if (registered.kind === 'request') {
				this.dispatchRequest(msg.id, msg.params, registered.handler);
				return true;
			}
			if (registered.kind === 'event') {
				this.dispatchStream(msg.id, msg.method, msg.params, registered.handler);
				return true;
			}
			return false;
		}

		if (isNotification(msg)) {
			const registered = this.handlers.get(msg.method);
			if (!registered || registered.kind !== 'notification') return false;
			void Promise.resolve(registered.handler(msg.params)).catch(
				(error: unknown) => {
					this.state.onError(error);
				},
			);
			return true;
		}

		return false;
	}

	close(): void {
		for (const [, iterator] of this.state.activeStreams) {
			void iterator.return?.();
		}
		this.state.activeStreams.clear();
	}

	private dispatchRequest(
		id: number,
		params: unknown,
		handler: MethodHandler,
	): void {
		void Promise.resolve(handler(params)).then(
			(result) => this.state.send({ jsonrpc: '2.0', id, result }),
			(error: unknown) =>
				this.state.send({
					jsonrpc: '2.0',
					id,
					error: toErrorPayload(error),
				}),
		);
	}

	private dispatchStream(
		requestId: number,
		method: string,
		params: unknown,
		handler: EventHandler,
	): void {
		const iterator = handler(params)[Symbol.asyncIterator]();
		this.state.activeStreams.set(requestId, iterator);

		void (async () => {
			try {
				for (;;) {
					const step = await iterator.next();
					if (step.done) {
						this.state.send({
							jsonrpc: '2.0',
							id: requestId,
							result: null,
						});
						return;
					}
					this.state.send({
						jsonrpc: '2.0',
						method: `${method}/update`,
						params: { requestId, body: step.value },
					});
				}
			} catch (error: unknown) {
				this.state.send({
					jsonrpc: '2.0',
					id: requestId,
					error: toErrorPayload(error),
				});
			} finally {
				this.state.activeStreams.delete(requestId);
			}
		})();
	}
}
