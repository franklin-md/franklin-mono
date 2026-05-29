import {
	FILESYSTEM_FILE_REFERENCE_TYPE,
	type Reference,
} from '@franklin/agent';

export function isFileReference(reference: Reference): boolean {
	return (
		reference.type === undefined ||
		reference.type === FILESYSTEM_FILE_REFERENCE_TYPE
	);
}
