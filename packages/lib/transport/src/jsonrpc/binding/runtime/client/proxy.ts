import type {
	EventMethodNames,
	MethodName,
	NotificationMethodNames,
	RequestMethodNames,
	RpcMethods,
} from '../../../protocol/method-types.js';
import { AsyncEventQueue as Queue } from '../../event-queue.js';
import type { ClientBindingState, RuntimeSideManifest } from '../types.js';

export function createRemoteProxy<TRemote extends RpcMethods<TRemote>>(
	state: ClientBindingState,
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

		// TODO: Do we actually want this stream cancel mechanism?
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
