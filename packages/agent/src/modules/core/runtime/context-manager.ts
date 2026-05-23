import type { ContextManager } from '../context-manager/index.js';
import type { CoreRuntime } from './types.js';

const CONTEXT_MANAGER: unique symbol = Symbol('franklin/core/context-manager');

type ContextManagerCarrier = {
	readonly [CONTEXT_MANAGER]?: ContextManager;
};

export function attachContextManager<Runtime extends CoreRuntime>(
	runtime: Runtime,
	contextManager: ContextManager,
): Runtime {
	Object.defineProperty(runtime, CONTEXT_MANAGER, {
		value: contextManager,
		enumerable: true,
	});
	return runtime;
}

export function getContextManager(runtime: CoreRuntime): ContextManager {
	const contextManager = (runtime as ContextManagerCarrier)[CONTEXT_MANAGER];
	if (!contextManager) {
		throw new Error('Core runtime is missing internal context manager');
	}
	return contextManager;
}
