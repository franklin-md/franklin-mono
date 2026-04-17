import type { MethodMiddleware } from './types.js';

/**
 * No-op middleware that forwards params to next unchanged.
 * Use for methods that don't need transformation.
 */
export function passThrough<
	Fn extends (...args: any[]) => any,
>(): MethodMiddleware<Fn> {
	return (params, next) => next(params);
}
