export type {
	NetworkPermissions,
	WebFetchMethod,
	WebFetchRequest,
	WebFetchResponse,
	Fetch,
	FetchDecorator,
	WebAPI,
} from './types.js';

export { withPolicy, assertAllowed } from './policy.js';
export { withNormalize } from './normalize.js';
export { withBounded } from './bounded.js';
export type { BoundedOptions } from './bounded.js';
