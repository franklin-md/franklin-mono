import { createHash } from 'node:crypto';

export function cacheHash(value: string | Uint8Array): string {
	return createHash('sha256').update(value).digest('hex');
}
