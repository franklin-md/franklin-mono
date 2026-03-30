import { bindClient } from '@franklin/lib/proxy';
import type { Descriptor, ProxyType } from '@franklin/lib/proxy';
import type { PreloadBridgeOf } from '../../../shared/api.js';
import { createClientRuntime } from './runtime.js';

export function bindRenderer<D extends Descriptor>(
	name: string,
	schema: D,
	bridge: PreloadBridgeOf<D>,
): ProxyType<D> {
	void name;
	const runtime = createClientRuntime(bridge as Record<string, unknown>);
	return bindClient(schema, runtime);
}
