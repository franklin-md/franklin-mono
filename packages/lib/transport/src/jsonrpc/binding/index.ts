import type { Duplex } from '../../streams/types.js';

import { createPeerBinding } from './runtime/index.js';
import type { PeerBinding } from './runtime/index.js';
import type { Protocol } from '../protocol/messages.js';
import type { ProtocolManifest } from '../protocol/manifest.js';
import type { RpcMethods } from '../protocol/method-types.js';
import type { JsonRpcMessage } from '../types.js';

export type {
	PeerBinding,
	ClientBinding,
	ServerBinding,
} from './runtime/index.js';
export { createClientBinding, createServerBinding } from './runtime/index.js';

/**
 * Bind as the client (calling the server).
 *
 * Returns `remote` (server proxy) immediately. Call `bind(handlers)` to
 * provide client-side handlers and start message dispatch.
 */
export function bindClient<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
>(options: {
	duplex: Protocol<TServer, TClient>;
	manifest: ProtocolManifest<TServer, TClient>;
}): PeerBinding<TServer, TClient> {
	return createPeerBinding<TServer, TClient>({
		duplex: options.duplex as Duplex<JsonRpcMessage>,
		remoteManifest: options.manifest.server,
		localManifest: options.manifest.client,
	});
}

/**
 * Bind as the server (handling client requests).
 *
 * Returns `remote` (client proxy) immediately. Call `bind(handlers)` to
 * provide server-side handlers and start message dispatch.
 */
export function bindServer<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
>(options: {
	duplex: Protocol<TClient, TServer>;
	manifest: ProtocolManifest<TServer, TClient>;
}): PeerBinding<TClient, TServer> {
	return createPeerBinding<TClient, TServer>({
		duplex: options.duplex as Duplex<JsonRpcMessage>,
		remoteManifest: options.manifest.client,
		localManifest: options.manifest.server,
	});
}
