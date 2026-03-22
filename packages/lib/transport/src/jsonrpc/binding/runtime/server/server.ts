import type { RpcMethods } from '../../../protocol/method-types.js';
import type { JsonRpcMessage } from '../../../types.js';
import type {
	RuntimeSideManifest,
	ServerBinding,
	ServerBindingState,
} from '../types.js';
import { handleRequestMessage } from './dispatch/request.js';
import {
	handleStreamCancelNotification,
	handleStreamRequest,
} from './dispatch/stream.js';
import { handleNotificationMessage } from './dispatch/notification.js';

export function createServerBinding<
	TLocal extends RpcMethods<TLocal>,
>(options: {
	manifest: RuntimeSideManifest;
	handlers: TLocal;
	send: (message: JsonRpcMessage) => void;
	onError: (error: unknown) => void;
}): ServerBinding {
	const state: ServerBindingState = {
		send: options.send,
		onError: options.onError,
		activeStreams: new Map(),
	};

	return {
		handleMessage(msg: JsonRpcMessage): boolean {
			if (handleStreamCancelNotification(state, msg)) return true;
			if (handleRequestMessage(state, options.manifest, options.handlers, msg))
				return true;
			if (handleStreamRequest(state, options.manifest, options.handlers, msg))
				return true;
			if (
				handleNotificationMessage(
					state,
					options.manifest,
					options.handlers,
					msg,
				)
			)
				return true;
			return false;
		},
		close() {
			for (const [, iterator] of state.activeStreams) {
				void iterator.return?.();
			}
			state.activeStreams.clear();
		},
	};
}
