import { isRequest } from '../../types.js';
import { RpcError } from '../../errors.js';
import { observe } from '../../../streams/readable/observe.js';
import { callable } from '../../../streams/writable/callable.js';
import type { RpcMethods } from '../../protocol/method-types.js';

import type { PeerBinding, PeerBindingOptions } from './types.js';
import { createServerBinding } from './server/server.js';
import { createClientBinding } from './client/client.js';

export type {
	PeerBinding,
	PeerBindingOptions,
	ClientBinding,
	ClientBindingState,
	RuntimeMethodKind,
	RuntimeSideManifest,
	ServerBinding,
	ServerBindingState,
} from './types.js';

export { createServerBinding } from './server/server.js';
export { createClientBinding } from './client/client.js';

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
	TRemote extends RpcMethods<TRemote>,
	TLocal extends RpcMethods<TLocal>,
>({
	duplex,
	remoteManifest,
	localManifest,
}: PeerBindingOptions): PeerBinding<TRemote, TLocal> {
	const send = callable(duplex.writable);

	const client = createClientBinding<TRemote>({
		manifest: remoteManifest,
		send,
	});

	let bound = false;

	return {
		remote: client.remote,

		bind(
			handlers: TLocal,
			onError?: (error: unknown) => void,
		): { close(): Promise<void> } {
			if (bound) throw new Error('Already bound');
			bound = true;

			const server = createServerBinding({
				manifest: localManifest,
				handlers,
				send,
				onError: onError ?? console.error,
			});

			const observer = observe(duplex.readable);

			observer.subscribe((msg) => {
				if (client.handleMessage(msg)) return;
				if (server.handleMessage(msg)) return;
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
					client.close();
					server.close();
					await duplex.close();
				},
			};
		},
	};
}
