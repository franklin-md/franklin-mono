import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export function sha256Hex(data: Uint8Array): string {
	return bytesToHex(sha256(data));
}
