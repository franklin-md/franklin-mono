export type {
	NetworkPermissions,
	WebFetchMethod,
	WebFetchRequest,
	WebFetchResponse,
	Fetch,
	WebAPI,
} from './types.js';

export type { FetchDecorator } from './decorators/types.js';
export type { FetchBuilder } from './decorators/builder.js';
export { decorate } from './decorators/builder.js';
export { withPolicy, assertAllowed } from './decorators/policy.js';
export { withUserAgent } from './decorators/user-agent.js';
export { withTimeout } from './decorators/timeout.js';
export { withRedirect } from './decorators/redirect.js';
export { withRetry } from './decorators/retry.js';
export type { RetryOptions } from './decorators/retry.js';
export { getHeader, setHeader } from './headers.js';
export { readBodyWithLimit } from './body-limit.js';
