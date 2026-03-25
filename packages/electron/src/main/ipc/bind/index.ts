import type { WebContents } from 'electron';

import type { ProxyDescriptor } from '../../../shared/descriptors/types.js';
import { createBoundWindow } from './bound-window.js';
import { registerProxyHandlers } from './proxy.js';
import type { MainBindingHandle } from './types.js';

const activeBindings = new Map<string, MainBindingHandle>();

export function bindMain<T>(
	name: string,
	schema: ProxyDescriptor<T>,
	impl: T,
	webContents: WebContents,
): MainBindingHandle {
	const previous = activeBindings.get(name);
	if (previous) {
		previous.dispose().catch(console.error);
	}

	const binding = createBoundWindow(name, webContents, impl);
	const unregister = registerProxyHandlers(
		name,
		binding,
		[],
		schema as ProxyDescriptor<unknown>,
	);

	const handle: MainBindingHandle = {
		dispose: async () => {
			if (activeBindings.get(name) !== handle) return;
			activeBindings.delete(name);

			for (const fn of unregister) fn();
			await binding.dispose();
		},
	};

	activeBindings.set(name, handle);
	return handle;
}

export type { MainBindingHandle } from './types.js';
