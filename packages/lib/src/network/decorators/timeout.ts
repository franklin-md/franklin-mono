import { withDeadline } from '../../utils/async/deadline.js';
import type { Fetch } from '../types.js';
import type { FetchDecorator } from './types.js';

/**
 * Carry an absolute deadline to the transport so expiration cancels both
 * connection setup and body reads, including across IPC and redirects. The
 * outer race also bounds custom transports that do not implement cancellation.
 */
export function withTimeout(timeoutMs: number): FetchDecorator {
	return (next: Fetch): Fetch =>
		(request) => {
			const deadline = Math.min(
				request.deadline ?? Infinity,
				Date.now() + timeoutMs,
			);
			return withDeadline(
				next({ ...request, deadline }),
				Math.max(0, deadline - Date.now()),
				'Request',
			);
		};
}
