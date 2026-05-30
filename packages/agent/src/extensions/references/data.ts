import type {
	ResolvedData,
	ResolvedReference,
} from '../../modules/references/api/index.js';

export type ReferenceWithBytes = ResolvedReference & {
	readonly data: ResolvedData;
};

export function hasBytesData(
	reference: ResolvedReference,
): reference is ReferenceWithBytes {
	return reference.data !== undefined;
}

export function assertBytesData(
	reference: ResolvedReference,
): asserts reference is ReferenceWithBytes {
	if (!hasBytesData(reference)) {
		throw new Error('Reference bytes are required');
	}
}
