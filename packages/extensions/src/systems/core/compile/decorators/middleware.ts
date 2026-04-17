import type { FullMiddleware } from '../../api/middleware/types.js';
import { apply } from '@franklin/lib/middleware';
import type { ProtocolDecorator } from '../decorator.js';

export function createMiddlewareDecorator(
	mw: FullMiddleware,
): ProtocolDecorator {
	return {
		name: 'middleware',
		async server(s) {
			return apply(mw.server, s);
		},
		async client(c) {
			return apply(mw.client, c);
		},
	};
}
