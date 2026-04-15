import type { EventDescriptor } from './event.js';
import type { MethodDescriptor } from './method.js';
import type { NamespaceDescriptor } from './namespace.js';
import type { NotificationDescriptor } from './notification.js';
import type { OnDescriptor } from './on.js';
import type { ResourceDescriptor } from './resource.js';
import type { StreamDescriptor } from './stream.js';

export type Descriptor =
	| MethodDescriptor<any, any>
	| NotificationDescriptor<any>
	| EventDescriptor<any, any>
	| OnDescriptor<any>
	| StreamDescriptor<any, any>
	| NamespaceDescriptor<any, any>
	| ResourceDescriptor<any, any>;

export type AnyShape = Record<string, Descriptor>;
