import type { ProxyDescriptor } from '../../../shared/descriptors/types.js';
import type { PreloadBridgeOf } from '../../../shared/api.js';
import { bindProxy } from './proxy.js';

export function bindRenderer<T>(
	name: string,
	schema: ProxyDescriptor<T>,
	bridge: PreloadBridgeOf<T>,
): T {
	return bindProxy(
		name,
		[],
		schema as ProxyDescriptor<unknown>,
		bridge as Record<string, unknown>,
	) as T;
}
