import type { WebContents } from 'electron';

import type { ProxyDescriptor } from '../../../shared/descriptors/types.js';
import { createBindingContext } from './context.js';
import { registerProxyHandlers } from './proxy.js';
import type { MainBindingHandle } from './types.js';

const activeBindings = new Map<string, MainBindingHandle>();

export function bindMain<T>(
	name: string,
	schema: ProxyDescriptor<T, any>,
	impl: T,
	webContents: WebContents,
): MainBindingHandle {
	const previous = activeBindings.get(name);
	if (previous) {
		previous.dispose().catch(console.error);
	}

	const context = createBindingContext(name, webContents, impl);
	const unregister = registerProxyHandlers(
		name,
		context,
		[],
		schema as ProxyDescriptor<unknown, any>,
	);

	const handle: MainBindingHandle = {
		dispose: async () => {
			if (activeBindings.get(name) !== handle) return;
			activeBindings.delete(name);

			for (const fn of unregister) fn();
			await context.dispose();
		},
	};

	activeBindings.set(name, handle);
	return handle;
}

export type { MainBindingHandle } from './types.js';
