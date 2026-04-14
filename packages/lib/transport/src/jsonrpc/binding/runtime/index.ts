import {
	bindClient as proxyBindClient,
	bindServer as proxyBindServer,
	type Descriptor,
	type ProxyType,
} from '@franklin/lib';
import { isRequest } from '../../types.js';
import { RpcError } from '../../errors.js';
import { observe } from '../../../streams/readable/observe.js';
import { callable } from '../../../streams/writable/callable.js';
import type { Duplex } from '../../../streams/types.js';
import type { JsonRpcMessage } from '../../types.js';

import type { PeerBinding } from './types.js';
import { JsonRpcProxyRuntime } from './client/runtime.js';
import { JsonRpcServerRuntime } from './server/runtime.js';

export type {
	PeerBinding,
	ClientBindingState,
	ServerBindingState,
} from './types.js';

export { JsonRpcProxyRuntime } from './client/runtime.js';
export { JsonRpcServerRuntime } from './server/runtime.js';

/**
 * Create a two-phase peer binding.
 *
 * Phase 1 (immediate): returns `remote` — a typed proxy for calling methods
 * on the other side of the duplex.
 *
 * Phase 2 (`bind`): provide local handlers and start dispatching inbound
 * messages. Returns a close handle.
 */
export function createPeerBinding<
	TRemoteDesc extends Descriptor,
	TLocalDesc extends Descriptor,
>({
	duplex,
	remoteDescriptor,
	localDescriptor,
}: {
	duplex: Duplex<JsonRpcMessage>;
	remoteDescriptor: TRemoteDesc;
	localDescriptor: TLocalDesc;
}): PeerBinding<ProxyType<TRemoteDesc>, ProxyType<TLocalDesc>> {
	const send = callable(duplex.writable);

	const clientRuntime = new JsonRpcProxyRuntime(send);
	const remote = proxyBindClient(
		remoteDescriptor,
		clientRuntime,
	) as ProxyType<TRemoteDesc>;

	let bound = false;

	return {
		remote,

		bind(
			handlers: ProxyType<TLocalDesc>,
			onError?: (error: unknown) => void,
		): { close(): Promise<void> } {
			if (bound) throw new Error('Already bound');
			bound = true;

			const serverRuntime = new JsonRpcServerRuntime(
				send,
				onError ?? console.error,
			);
			proxyBindServer(localDescriptor, handlers, serverRuntime);

			const observer = observe(duplex.readable);

			observer.subscribe((msg) => {
				if (clientRuntime.handleMessage(msg)) return;
				if (serverRuntime.handleMessage(msg)) return;
				if (isRequest(msg)) {
					send({
						jsonrpc: '2.0',
						id: msg.id,
						error: RpcError.methodNotFound(msg.method).toPayload(),
					});
				}
			});

			return {
				async close() {
					observer.dispose();
					clientRuntime.close();
					serverRuntime.close();
					await duplex.dispose();
				},
			};
		},
	};
}
