import type {
	ProxyRuntime,
	MethodHandler,
	NotificationHandler,
	EventHandler,
} from '@franklin/lib';
import type { JsonRpcMessage } from '../../../types.js';
import { isResponse } from '../../../types.js';
import { AsyncEventQueue } from '../../event-queue.js';
import type { ClientBindingState, PendingRequest } from '../types.js';
import { handleResponseForRequest } from './dispatch/request.js';
import {
	handleResponseForStream,
	handleStreamUpdateNotification,
} from './dispatch/stream.js';
import { closePending } from '../util.js';

export class JsonRpcProxyRuntime implements ProxyRuntime {
	private readonly state: ClientBindingState;
	private readonly prefix: string;

	constructor(
		send: (message: JsonRpcMessage) => void,
		prefix?: string,
		state?: ClientBindingState,
	) {
		this.prefix = prefix ?? '';
		this.state = state ?? {
			send,
			nextId: 0,
			pendingRequests: new Map<number, PendingRequest>(),
			pendingStreams: new Map<number, AsyncEventQueue<unknown>>(),
		};
	}

	bindNamespace(key: string): ProxyRuntime {
		const childPrefix = this.prefix ? `${this.prefix}/${key}` : key;
		return new JsonRpcProxyRuntime(this.state.send, childPrefix, this.state);
	}

	bindMethod(): MethodHandler {
		const methodName = this.prefix;
		return (params: unknown) => {
			const id = this.state.nextId++;
			return new Promise<unknown>((resolve, reject) => {
				this.state.pendingRequests.set(id, { resolve, reject });
				this.state.send({
					jsonrpc: '2.0',
					id,
					method: methodName,
					params,
				});
			});
		};
	}

	bindNotification(): NotificationHandler {
		const methodName = this.prefix;
		return (params: unknown) => {
			this.state.send({ jsonrpc: '2.0', method: methodName, params });
			return Promise.resolve();
		};
	}

	bindEvent(): EventHandler {
		const methodName = this.prefix;
		return (params: unknown) => {
			const id = this.state.nextId++;
			// TODO: Do we actually want this stream cancel mechanism?
			const queue = new AsyncEventQueue<unknown>(() => {
				this.state.send({
					jsonrpc: '2.0',
					method: '$/stream/cancel',
					params: { requestId: id },
				});
				this.state.pendingStreams.delete(id);
			});
			this.state.pendingStreams.set(id, queue);
			this.state.send({ jsonrpc: '2.0', id, method: methodName, params });
			return queue;
		};
	}

	handleMessage(msg: JsonRpcMessage): boolean {
		if (isResponse(msg)) {
			if (handleResponseForStream(this.state, msg)) return true;
			if (handleResponseForRequest(this.state, msg)) return true;
			return false;
		}
		if (handleStreamUpdateNotification(this.state, msg)) return true;
		return false;
	}

	close(): void {
		closePending(this.state, new Error('Connection closed'));
	}
}
