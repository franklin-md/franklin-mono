import type { ServerRuntime as IServerRuntime } from '@franklin/lib';
import type { JsonRpcMessage } from '../../../types.js';
import {
	isRequest,
	isNotification,
	isStreamCancelNotification,
} from '../../../types.js';
import type { ServerBindingState } from '../types.js';
import { toErrorPayload } from '../util.js';

type RegisteredHandler =
	| {
			kind: 'request';
			handler: (...args: unknown[]) => Promise<unknown>;
	  }
	| {
			kind: 'notification';
			handler: (...args: unknown[]) => Promise<void>;
	  }
	| {
			kind: 'event';
			handler: (...args: unknown[]) => AsyncIterable<unknown>;
	  };

export class JsonRpcServerRuntime implements IServerRuntime {
	private readonly state: ServerBindingState;
	private readonly handlers = new Map<string, RegisteredHandler>();

	constructor(
		send: (message: JsonRpcMessage) => void,
		onError: (error: unknown) => void,
	) {
		this.state = {
			send,
			onError,
			activeStreams: new Map(),
		};
	}

	registerMethod(
		path: string[],
		handler: (...args: unknown[]) => Promise<unknown>,
	): () => void {
		const name = path.join('/');
		this.handlers.set(name, { kind: 'request', handler });
		return () => {
			this.handlers.delete(name);
		};
	}

	registerNotification(
		path: string[],
		handler: (...args: unknown[]) => Promise<void>,
	): () => void {
		const name = path.join('/');
		this.handlers.set(name, { kind: 'notification', handler });
		return () => {
			this.handlers.delete(name);
		};
	}

	registerEvent(
		path: string[],
		handler: (...args: unknown[]) => AsyncIterable<unknown>,
	): () => void {
		const name = path.join('/');
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
		handler: (...args: unknown[]) => Promise<unknown>,
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
		handler: (...args: unknown[]) => AsyncIterable<unknown>,
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
