import type { RpcMethods } from '../../../../protocol/method-types.js';
import type { JsonRpcMessage } from '../../../../types.js';
import { isRequest } from '../../../../types.js';
import type { RuntimeSideManifest, ServerBindingState } from '../../types.js';
import { toErrorPayload } from '../../util.js';

export function handleRequestMessage<TLocal extends RpcMethods<TLocal>>(
	state: ServerBindingState,
	localManifest: RuntimeSideManifest,
	handlers: TLocal,
	msg: JsonRpcMessage,
): boolean {
	if (!isRequest(msg)) return false;

	if (localManifest[msg.method]?.kind !== 'request') {
		return false;
	}

	const handler = handlers[msg.method as keyof TLocal] as (
		params: unknown,
	) => Promise<unknown>;

	void Promise.resolve(handler(msg.params)).then(
		(result) => state.send({ jsonrpc: '2.0', id: msg.id, result }),
		(error: unknown) =>
			state.send({
				jsonrpc: '2.0',
				id: msg.id,
				error: toErrorPayload(error),
			}),
	);
	return true;
}
