import { bindClient } from '@franklin/lib/proxy';
import type { NamespaceDescriptor, ProxyType } from '@franklin/lib/proxy';
import { createChannels } from '../../../shared/channels.js';
import type { PreloadBridgeOf } from '../../../shared/api.js';
import { createClientRuntime } from './runtime.js';

export function bindRenderer<TSchema extends NamespaceDescriptor<any, any>>(
	name: string,
	schema: TSchema,
	bridge: PreloadBridgeOf<TSchema>,
): ProxyType<TSchema> {
	const channels = createChannels(name);
	const runtime = createClientRuntime(
		channels,
		bridge as Record<string, unknown>,
	);
	return bindClient(schema, runtime);
}
