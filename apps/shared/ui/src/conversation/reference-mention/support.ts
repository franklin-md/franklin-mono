import type { Reference } from '@franklin/agent';

export function isFileReference(reference: Reference): boolean {
	return reference.type === undefined || reference.type === 'file';
}
