import type { ProxyType } from '../../types.js';
import type { Descriptor } from './index.js';

export type InferNamespaceValue<TShape extends Record<string, Descriptor>> = {
	[K in keyof TShape]: ProxyType<TShape[K]>;
};
