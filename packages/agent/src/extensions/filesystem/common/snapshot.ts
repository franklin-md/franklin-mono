import { sha256Hex } from '../hash.js';
import { detectFileType } from './supported.js';
import type { FileSnapshot } from './types.js';

export function createFileSnapshot(bytes: Uint8Array): FileSnapshot {
	const snapshot: FileSnapshot = { hash: sha256Hex(bytes) };
	const mime = detectFileType(bytes)?.mime;
	if (mime && !mime.startsWith('text/') && mime !== 'image/svg+xml') {
		return snapshot;
	}
	try {
		const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		if (!text.includes('\0')) snapshot.text = text;
	} catch {
		// Binary/unsupported reads retain the conservative hash-only check.
	}
	return snapshot;
}
