import { withDeadline } from '../utils/async/deadline.js';
import type { Fetch, FetchDecorator } from './types.js';

/**
 * Races the inner call against a deadline. On overrun, rejects with a timeout
 * error. The inner fetch is *not* actively aborted — there's no AbortSignal
 * threaded through the Fetch contract — so the underlying connection leaks
 * until it closes naturally. Acceptable for agent tool calls where responses
 * are bounded.
 */
export function withTimeout(timeoutMs: number): FetchDecorator {
	return (next: Fetch): Fetch =>
		(request) =>
			withDeadline(next(request), timeoutMs, 'Request');
}
