import type { WebContents } from 'electron';
import { bindServer } from '@franklin/lib/proxy';
import type { Descriptor, ProxyType } from '@franklin/lib/proxy';
import { createScope } from '../../../shared/channels.js';
import { createServerRuntime } from './runtime.js';

export interface MainBindingHandle {
	dispose(): Promise<void>;
}

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

	const scope = createScope(name);
	const runtime = createServerRuntime(scope, webContents);
	const binding = bindServer(schema, impl, runtime);

	const handle: MainBindingHandle = {
		dispose: async () => {
			if (activeBindings.get(name) !== handle) return;
			activeBindings.delete(name);
			await binding.dispose();
		},
	};

	activeBindings.set(name, handle);
	return handle;
}
