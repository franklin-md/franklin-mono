import type { Duplex } from '../../streams/types.js';

import { bindPeer, type Binding, type RuntimeSideManifest } from './runtime.js';
import type { Protocol } from '../protocol/messages.js';
import type { ProtocolManifest } from '../protocol/manifest.js';
import type { RpcMethods } from '../protocol/method-types.js';
import type { JsonRpcMessage } from '../types.js';

function toRuntimeManifest(manifest: RuntimeSideManifest): RuntimeSideManifest {
	return manifest;
}

export type { Binding } from './runtime.js';

export function bindClient<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
>(options: {
	duplex: Protocol<TServer, TClient>;
	manifest: ProtocolManifest<TServer, TClient>;
	handlers: TClient;
}): Binding<TServer> {
	return bindPeer({
		duplex: options.duplex as Duplex<JsonRpcMessage>,
		remoteManifest: toRuntimeManifest(options.manifest.server),
		localManifest: toRuntimeManifest(options.manifest.client),
		handlers: options.handlers,
	});
}

export function bindServer<
	TServer extends RpcMethods<TServer>,
	TClient extends RpcMethods<TClient>,
>(options: {
	duplex: Protocol<TClient, TServer>;
	manifest: ProtocolManifest<TServer, TClient>;
	handlers: TServer;
}): Binding<TClient> {
	return bindPeer({
		duplex: options.duplex as Duplex<JsonRpcMessage>,
		remoteManifest: toRuntimeManifest(options.manifest.client),
		localManifest: toRuntimeManifest(options.manifest.server),
		handlers: options.handlers,
	});
}
