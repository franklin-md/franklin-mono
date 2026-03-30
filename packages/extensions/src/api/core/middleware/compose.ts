import type { MethodMiddleware, Middleware } from './types.js';

/**
 * Chain two single-method middleware: a wraps b wraps next.
 */
export function composeMethod<Fn extends (...args: any[]) => any>(
	a: MethodMiddleware<Fn>,
	b: MethodMiddleware<Fn>,
): MethodMiddleware<Fn> {
	// CPS
	return (params, next) => a(params, (p) => b(p, next));
}

function composeMiddleware<T>(
	acc: Middleware<T>,
	mw: Middleware<T>,
): Middleware<T> {
	const result = {} as Record<string, MethodMiddleware<any>>;
	const accRec = acc as Record<string, MethodMiddleware<any>>;
	const mwRec = mw as Record<string, MethodMiddleware<any>>;

	for (const key of Object.keys(accRec)) {
		const left = accRec[key];
		const right = mwRec[key];
		if (!left || !right) {
			throw new Error(`Missing middleware for "${key}"`);
		}
		result[key] = composeMethod(left, right);
	}

	return result as Middleware<T>;
}

/**
 * Compose N middleware into one.
 * Per method key, folds with composeMethod. Outermost-first ordering.
 */
export function compose<T>(...middlewares: Middleware<T>[]): Middleware<T> {
	if (middlewares.length === 0) return {} as Middleware<T>;

	return middlewares.reduce(composeMiddleware);
}
