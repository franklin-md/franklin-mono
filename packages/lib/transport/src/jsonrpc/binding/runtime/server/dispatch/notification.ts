import type { RpcMethods } from '../../../../protocol/method-types.js';
import type { JsonRpcMessage } from '../../../../types.js';
import { isNotification } from '../../../../types.js';
import type { RuntimeSideManifest, ServerBindingState } from '../../types.js';

export function handleNotificationMessage<TLocal extends RpcMethods<TLocal>>(
	state: ServerBindingState,
	localManifest: RuntimeSideManifest,
	handlers: TLocal,
	msg: JsonRpcMessage,
): boolean {
	if (!isNotification(msg)) return false;
	if (localManifest[msg.method]?.kind !== 'notification') return false;

	const handler = handlers[msg.method as keyof TLocal] as (
		params: unknown,
	) => Promise<void>;
	void Promise.resolve(handler(msg.params)).catch((error: unknown) => {
		state.onError(error);
	});
	return true;
}
