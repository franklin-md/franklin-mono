import type { RpcMethods } from '../../../../protocol/method-types.js';
import type { JsonRpcMessage } from '../../../../types.js';
import { isRequest, isStreamCancelNotification } from '../../../../types.js';
import type { RuntimeSideManifest, ServerBindingState } from '../../types.js';
import { toErrorPayload } from '../../util.js';

export function handleStreamCancelNotification(
	state: ServerBindingState,
	msg: JsonRpcMessage,
): boolean {
	if (!isStreamCancelNotification(msg)) return false;
	const iterator = state.activeStreams.get(msg.params.requestId);
	if (!iterator) return true;
	void iterator.return?.();
	state.activeStreams.delete(msg.params.requestId);
	return true;
}

export function handleStreamRequest<TLocal extends RpcMethods<TLocal>>(
	state: ServerBindingState,
	localManifest: RuntimeSideManifest,
	handlers: TLocal,
	msg: JsonRpcMessage,
): boolean {
	if (!isRequest(msg)) return false;
	if (localManifest[msg.method]?.kind !== 'event') return false;

	const requestId = msg.id;
	const handler = handlers[msg.method as keyof TLocal] as (
		params: unknown,
	) => AsyncIterable<unknown>;
	const iterator = handler(msg.params)[Symbol.asyncIterator]();
	state.activeStreams.set(requestId, iterator);

	const method = msg.method;
	void (async () => {
		try {
			for (;;) {
				const step = await iterator.next();
				if (step.done) {
					state.send({
						jsonrpc: '2.0',
						id: requestId,
						result: null,
					});
					return;
				}
				state.send({
					jsonrpc: '2.0',
					method: `${method}/update`,
					params: { requestId, body: step.value },
				});
			}
		} catch (error: unknown) {
			state.send({
				jsonrpc: '2.0',
				id: requestId,
				error: toErrorPayload(error),
			});
		} finally {
			state.activeStreams.delete(requestId);
		}
	})();
	return true;
}
