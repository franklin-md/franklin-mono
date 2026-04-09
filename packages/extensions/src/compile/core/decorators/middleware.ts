import type { FullMiddleware } from '../../../api/core/middleware/types.js';
import { apply } from '../../../api/core/middleware/apply.js';
import type { ProtocolDecorator } from '../decorator.js';

export function createMiddlewareDecorator(
	mw: FullMiddleware,
): ProtocolDecorator {
	return {
		name: 'middleware',
		async agent(a) {
			return apply(mw.server, a);
		},
		async client(c) {
			return apply(mw.client, c);
		},
	};
}
