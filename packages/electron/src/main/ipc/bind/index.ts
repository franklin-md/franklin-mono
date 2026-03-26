import type { WebContents } from 'electron';
import { bindServer } from '@franklin/lib/proxy';
import type { Descriptor, ProxyType } from '@franklin/lib/proxy';
import { createChannels } from '../../../shared/channels.js';
import { createBindingContext } from './context.js';
import { createServerRuntime } from './runtime.js';
import type { MainBindingHandle } from './types.js';

const activeBindings = new Map<string, MainBindingHandle>();

export function bindMain<D extends Descriptor>(
	name: string,
	schema: D,
	impl: ProxyType<D>,
	webContents: WebContents,
): MainBindingHandle {
	const previous = activeBindings.get(name);
	if (previous) {
		previous.dispose().catch(console.error);
	}

	const context = createBindingContext(name, webContents, impl);
	const channels = createChannels(name);
	const runtime = createServerRuntime(channels, context);
	const binding = bindServer(schema, impl, runtime);

	const handle: MainBindingHandle = {
		dispose: async () => {
			if (activeBindings.get(name) !== handle) return;
			activeBindings.delete(name);

			binding.dispose();
			await context.dispose();
		},
	};

	activeBindings.set(name, handle);
	return handle;
}

export type { MainBindingHandle } from './types.js';
