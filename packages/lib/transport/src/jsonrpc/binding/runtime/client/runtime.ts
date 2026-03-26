import type { ProxyRuntime } from '@franklin/lib';
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
	private nextId = 0;
	private readonly state: ClientBindingState;

	constructor(send: (message: JsonRpcMessage) => void) {
		this.state = {
			send,
			pendingRequests: new Map<number, PendingRequest>(),
			pendingStreams: new Map<number, AsyncEventQueue<unknown>>(),
		};
	}

	bindMethod(path: string[]): (...args: unknown[]) => Promise<unknown> {
		const methodName = path.join('/');
		return (params: unknown) => {
			const id = this.nextId++;
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

	bindNotification(path: string[]): (...args: unknown[]) => Promise<void> {
		const methodName = path.join('/');
		return (params: unknown) => {
			this.state.send({ jsonrpc: '2.0', method: methodName, params });
			return Promise.resolve();
		};
	}

	bindEvent(path: string[]): (...args: unknown[]) => AsyncIterable<unknown> {
		const methodName = path.join('/');
		return (params: unknown) => {
			const id = this.nextId++;
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
