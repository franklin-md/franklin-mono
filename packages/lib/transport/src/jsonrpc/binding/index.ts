import type { Duplex } from '../../streams/types.js';

import { bindPeer, type Binding } from './runtime/index.js';
import type { Protocol } from '../protocol/messages.js';
import type { ProtocolManifest } from '../protocol/manifest.js';
import type { RpcMethods } from '../protocol/method-types.js';
import type { JsonRpcMessage } from '../types.js';

export type { Binding, ClientBinding, ServerBinding } from './runtime/index.js';
export { createClientBinding, createServerBinding } from './runtime/index.js';

export function bindClient<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
>(options: {
	duplex: Protocol<TServer, TClient>;
	manifest: ProtocolManifest<TServer, TClient>;
	handlers: TClient;
	onError?: (error: unknown) => void;
}): Binding<TServer> {
	return bindPeer({
		duplex: options.duplex as Duplex<JsonRpcMessage>,
		remoteManifest: options.manifest.server,
		localManifest: options.manifest.client,
		handlers: options.handlers,
		onError: options.onError,
	});
}

export function bindServer<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
>(options: {
	duplex: Protocol<TClient, TServer>;
	manifest: ProtocolManifest<TServer, TClient>;
	handlers: TServer;
	onError?: (error: unknown) => void;
}): Binding<TClient> {
	return bindPeer({
		duplex: options.duplex as Duplex<JsonRpcMessage>,
		remoteManifest: options.manifest.client,
		localManifest: options.manifest.server,
		handlers: options.handlers,
		onError: options.onError,
	});
}
