import { bindClient } from '@franklin/lib/proxy';
import type { Descriptor, ProxyType } from '@franklin/lib/proxy';
import { createChannels } from '../../../shared/channels.js';
import type { PreloadBridgeOf } from '../../../shared/api.js';
import { createClientRuntime } from './runtime.js';

export function bindRenderer<D extends Descriptor>(
	name: string,
	schema: D,
	bridge: PreloadBridgeOf<D>,
): ProxyType<D> {
	const channels = createChannels(name);
	const runtime = createClientRuntime(
		channels,
		bridge as Record<string, unknown>,
	);
	return bindClient(schema, runtime);
}
