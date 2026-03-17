import type { Middleware } from './types.js';
import { emptyMiddleware } from './empty.js';
import { sequence } from './sequence.js';

export function composeAll(middlewares: readonly Middleware[]): Middleware {
	return middlewares.reduce((acc, mw) => sequence(acc, mw), emptyMiddleware);
}
