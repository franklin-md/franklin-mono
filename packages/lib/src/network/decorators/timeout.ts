import type { Fetch } from '../types.js';
import type { FetchDecorator } from './types.js';

/**
 * Carry an absolute deadline to the transport so expiration cancels both
 * connection setup and body reads, including across IPC and redirects. The
 * outer race also bounds custom transports that do not implement cancellation.
 */
export function withTimeout(timeoutMs: number): FetchDecorator {
	return (next: Fetch): Fetch =>
		async (request) => {
			const timeoutDeadline = Date.now() + timeoutMs;
			const deadline = Math.min(request.deadline ?? Infinity, timeoutDeadline);
			// Scheduling uses the remaining budget; diagnostics describe the policy
			// that expired, rather than a countdown changed by request setup time.
			const timeoutError = new Error(
				deadline < timeoutDeadline
					? 'Request deadline exceeded'
					: `Request timed out after ${timeoutMs}ms`,
			);
			const remainingMs = deadline - Date.now();
			if (remainingMs <= 0) throw timeoutError;

			let timer: ReturnType<typeof setTimeout> | undefined;
			try {
				const timeout = new Promise<never>((_, reject) => {
					timer = setTimeout(() => reject(timeoutError), remainingMs);
					(timer as unknown as { unref?: () => void }).unref?.();
				});
				const response = await Promise.race([
					next({ ...request, deadline }),
					timeout,
				]);
				// Synchronous transport work can block the timer callback past expiry.
				if (Date.now() >= deadline) throw timeoutError;
				return response;
			} finally {
				if (timer !== undefined) clearTimeout(timer);
			}
		};
}
