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
			result[key] = (params: unknown) =>
				mw[key]!(params, (p: unknown) =>
					(targetFn as (p: unknown) => unknown)(p),
				);
		} else {
			result[key] = targetFn;
		}
	}

	return result as T;
}
