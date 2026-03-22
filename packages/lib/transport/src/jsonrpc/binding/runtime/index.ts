import { isRequest } from '../../types.js';
import { RpcError } from '../../errors.js';
import { observe } from '../../../streams/readable/observe.js';
import { callable } from '../../../streams/writable/callable.js';
import type { RpcMethods } from '../../protocol/method-types.js';

import type { BindPeerOptions, Binding } from './types.js';
import { createServerBinding } from './server/server.js';
import { createClientBinding } from './client/client.js';

export type {
	Binding,
	BindPeerOptions,
	ClientBinding,
	ClientBindingState,
	RuntimeMethodKind,
	RuntimeSideManifest,
	ServerBinding,
	ServerBindingState,
} from './types.js';

export { createServerBinding } from './server/server.js';
export { createClientBinding } from './client/client.js';

export function bindPeer<
	TRemote extends RpcMethods<TRemote>,
	TLocal extends RpcMethods<TLocal>,
>({
	duplex,
	remoteManifest,
	localManifest,
	handlers,
	onError,
}: BindPeerOptions<TRemote, TLocal>): Binding<TRemote> {
	const send = callable(duplex.writable);

	const server = createServerBinding({
		manifest: localManifest,
		handlers,
		send,
		onError: onError ?? console.error,
	});

	const client = createClientBinding<TRemote>({
		manifest: remoteManifest,
		send,
	});

	const observer = observe(duplex.readable);

	observer.subscribe((msg) => {
		if (client.handleMessage(msg)) return;
		if (server.handleMessage(msg)) return;
		// Unmatched request — respond with methodNotFound
		if (isRequest(msg)) {
			send({
				jsonrpc: '2.0',
				id: msg.id,
				error: RpcError.methodNotFound(msg.method).toPayload(),
			});
		}
	});

	return {
		remote: client.remote,
		async close() {
			observer.dispose();
			client.close();
			server.close();
			await duplex.close();
		},
	};
}
