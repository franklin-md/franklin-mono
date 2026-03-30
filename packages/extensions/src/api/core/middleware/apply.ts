import type { MethodMiddleware, Middleware } from './types.js';

/**
 * Bind middleware to a target (handler object), returning a wrapped copy of T.
 * Every method in the target is wrapped by its corresponding middleware.
 */
export function apply<T extends object>(
	middleware: Middleware<T>,
	target: T,
): T {
	const result = {} as Record<string, unknown>;
	const mw = middleware as Record<string, MethodMiddleware<any>>;
	const tgt = target as Record<string, unknown>;

	for (const key of Object.keys(tgt)) {
		const targetFn = tgt[key];

		if (typeof targetFn === 'function') {
			const middlewareFn = mw[key];
			if (!middlewareFn) {
				throw new Error(`Missing middleware for "${key}"`);
			}
			result[key] = (params: unknown) =>
				middlewareFn(params, (p: unknown) =>
					(targetFn as (p: unknown) => unknown)(p),
				);
		} else {
			result[key] = targetFn;
		}
	}

	return result as T;
}
