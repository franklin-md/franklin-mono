import type { MethodDescriptor } from '../types/method.js';
import { METHOD_KIND } from '../types/method.js';

type AnyAsyncMethod = (...args: any[]) => Promise<any>;

export function method<TMethod extends AnyAsyncMethod>(): MethodDescriptor<
	Parameters<TMethod>,
	Awaited<ReturnType<TMethod>>
> {
	return { kind: METHOD_KIND };
}
