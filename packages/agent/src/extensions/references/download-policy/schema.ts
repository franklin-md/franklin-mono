import { z } from 'zod';

// Node timers clamp delays above this value to 1ms. Validate both persisted
// settings and extension contributions before passing durations to a transport.
// See https://nodejs.org/api/timers.html#settimeoutcallback-delay-args
const milliseconds = z.number().int().positive().max(2_147_483_647);

export const documentDownloadPolicySchema = z.object({
	idleTimeoutMs: milliseconds.default(60_000),
	totalTimeoutMs: milliseconds.default(15 * 60_000),
});
