import type { WithContext } from './types.js';

/**
 * Inverse of `WithContext`: close over `getCtx` so the resulting handler
 * accepts the original args without the trailing runtime parameter.
 *
 * Builders that take raw handlers usually call them inline as
 * `raw(args, getCtx())` and don't need this. Reach for `bindHandler` when
 * a downstream consumer expects the unwrapped shape — e.g. `buildWaterfall`
 * from `@franklin/lib`, which accepts only the bound `H`.
 */
export function bindHandler<H extends (...args: any[]) => any, R>(
	raw: WithContext<H, R>,
	getCtx: () => R,
): H {
	return ((...args: Parameters<H>) => raw(...args, getCtx())) as H;
}
