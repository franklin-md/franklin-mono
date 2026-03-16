import type { Duplex } from '../types.js';
import type { BridgeRequest, BridgeResponse } from './bridge.js';
import { pump } from '../readable/pump.js';
import { callable } from '../writable/callable.js';

/**
 * Consumes a request–response duplex by dispatching each request to a handler.
 *
 * This is the dual of `bridge()`: bridge is the caller side (enqueues
 * requests, awaits responses), serve is the handler side (reads requests,
 * writes responses).
 *
 * For each incoming request the handler is called with `request.body`.
 * On success the result is written as `{ id, result }`.
 * On error the message is written as `{ id, error }`.
 *
 * Returns void — the pump runs in the background and terminates when
 * the readable side closes.
 */
export function serve<Req, Res>(
	duplex: Duplex<BridgeRequest<Req>, BridgeResponse<Res>>,
	handler: (request: Req) => Promise<Res>,
): void {
	const write = callable(duplex.writable);

	void pump(duplex.readable, (request: BridgeRequest<Req>) => {
		void handler(request.body).then(
			(result) => {
				write({ id: request.id, result });
			},
			(err: unknown) => {
				const error = err instanceof Error ? err.message : String(err);
				write({ id: request.id, error });
			},
		);
	});
}
