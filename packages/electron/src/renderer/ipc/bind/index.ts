import type {
	ProxyDescriptor,
	ProxyValue,
} from '../../../shared/descriptors/types.js';
import type { PreloadBridgeOf } from '../../../shared/api.js';
import { bindProxy } from './proxy.js';

export function bindRenderer<TSchema extends ProxyDescriptor<any, any>>(
	name: string,
	schema: TSchema,
	bridge: PreloadBridgeOf<TSchema>,
): ProxyValue<TSchema> {
	return bindProxy(
		name,
		[],
		schema as ProxyDescriptor<unknown, any>,
		bridge as Record<string, unknown>,
	) as ProxyValue<TSchema>;
}
