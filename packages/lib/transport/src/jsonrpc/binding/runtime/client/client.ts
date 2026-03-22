import type { RpcMethods } from '../../../protocol/method-types.js';
import type { JsonRpcMessage } from '../../../types.js';
import { isResponse } from '../../../types.js';
import type {
	ClientBinding,
	ClientBindingState,
	RuntimeSideManifest,
} from '../types.js';
import { handleResponseForRequest } from './dispatch/request.js';
import {
	handleResponseForStream,
	handleStreamUpdateNotification,
} from './dispatch/stream.js';
import { createRemoteProxy } from './proxy.js';
import { closePending } from '../util.js';

export function createClientBinding<
	TRemote extends RpcMethods<TRemote>,
>(options: {
	manifest: RuntimeSideManifest;
	send: (message: JsonRpcMessage) => void;
}): ClientBinding<TRemote> {
	const state: ClientBindingState = {
		send: options.send,
		pendingRequests: new Map(),
		pendingStreams: new Map(),
	};

	const remote = createRemoteProxy<TRemote>(state, options.manifest);

	return {
		remote,
		handleMessage(msg: JsonRpcMessage): boolean {
			if (isResponse(msg)) {
				if (handleResponseForStream(state, msg)) return true;
				if (handleResponseForRequest(state, msg)) return true;
				return false;
			}
			if (handleStreamUpdateNotification(state, msg)) return true;
			return false;
		},
		close() {
			closePending(state, new Error('Connection closed'));
		},
	};
}
