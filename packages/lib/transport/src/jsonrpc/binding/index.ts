import type { Descriptor, ProxyType } from '@franklin/lib';
import type { Duplex } from '../../streams/types.js';
import type { JsonRpcMessage } from '../types.js';

import { createPeerBinding } from './runtime/index.js';
import type { PeerBinding } from './runtime/index.js';

export type { PeerBinding } from './runtime/index.js';
export { JsonRpcProxyRuntime, JsonRpcServerRuntime } from './runtime/index.js';

/**
 * Bind as the client (calling the server).
 *
 * Returns `remote` (server proxy) immediately. Call `bind(handlers)` to
 * provide client-side handlers and start message dispatch.
 */
export function bindClient<
	TServerDesc extends Descriptor,
	TClientDesc extends Descriptor,
>(options: {
	duplex: Duplex<JsonRpcMessage>;
	server: TServerDesc;
	client: TClientDesc;
}): PeerBinding<ProxyType<TServerDesc>, ProxyType<TClientDesc>> {
	return createPeerBinding({
		duplex: options.duplex,
		remoteDescriptor: options.server,
		localDescriptor: options.client,
	});
}

/**
 * Bind as the server (handling client requests).
 *
 * Returns `remote` (client proxy) immediately. Call `bind(handlers)` to
 * provide server-side handlers and start message dispatch.
 */
export function bindServer<
	TServerDesc extends Descriptor,
	TClientDesc extends Descriptor,
>(options: {
	duplex: Duplex<JsonRpcMessage>;
	server: TServerDesc;
	client: TClientDesc;
}): PeerBinding<ProxyType<TClientDesc>, ProxyType<TServerDesc>> {
	return createPeerBinding({
		duplex: options.duplex,
		remoteDescriptor: options.client,
		localDescriptor: options.server,
	});
}
