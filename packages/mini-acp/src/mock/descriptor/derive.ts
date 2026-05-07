import type { DeriveDescriptor } from './types.js';

export function derive(run: DeriveDescriptor['run']): DeriveDescriptor {
	return { type: 'derive', run };
}
