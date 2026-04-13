import type { Descriptor } from './types/index.js';
import {
	METHOD_KIND,
	NOTIFICATION_KIND,
	EVENT_KIND,
	ON_KIND,
	STREAM_KIND,
	NAMESPACE_KIND,
	RESOURCE_KIND,
} from './types/index.js';

export type DescriptorKind =
	| 'method'
	| 'notification'
	| 'event'
	| 'on'
	| 'stream'
	| 'namespace'
	| 'resource';

const KIND_MAP = new Map<symbol, DescriptorKind>([
	[METHOD_KIND, 'method'],
	[NOTIFICATION_KIND, 'notification'],
	[EVENT_KIND, 'event'],
	[ON_KIND, 'on'],
	[STREAM_KIND, 'stream'],
	[NAMESPACE_KIND, 'namespace'],
	[RESOURCE_KIND, 'resource'],
]);

export function descriptorKind(descriptor: Descriptor): DescriptorKind {
	const kind = KIND_MAP.get(descriptor.kind);
	if (!kind)
		throw new Error(`Unknown descriptor kind: ${String(descriptor.kind)}`);
	return kind;
}
