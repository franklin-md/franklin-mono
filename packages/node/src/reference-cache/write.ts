import { mkdir, rename, rm, utimes, writeFile } from 'node:fs/promises';
import type { WebFetchResponse } from '@franklin/lib';
import { cacheHash } from './hash.js';
import { pruneCache } from './prune.js';

export async function writeCachedResponse(
	directory: string,
	path: string,
	response: WebFetchResponse,
	expiresAt: number,
	maxBytes: number,
): Promise<void> {
	const { body, ...head } = response;
	const metadata = Buffer.from(
		JSON.stringify({
			version: 1,
			expiresAt,
			digest: cacheHash(body),
			response: head,
		}),
	);
	const length = Buffer.alloc(4);
	length.writeUInt32BE(metadata.length);
	const size = length.length + metadata.length + body.byteLength;
	if (size > maxBytes) return;
	await mkdir(directory, { recursive: true, mode: 0o700 });
	const temp = `${path}.${crypto.randomUUID()}.tmp`;
	try {
		// One binary envelope keeps metadata and bytes consistent across a crash.
		// Write beside the destination, then rename: readers only see complete entries.
		await writeFile(temp, Buffer.concat([length, metadata, body]), {
			mode: 0o600,
		});
		await rename(temp, path);
		const time = new Date(Date.now());
		await utimes(path, time, time);
	} finally {
		await rm(temp, { force: true });
	}
	await pruneCache(directory, maxBytes);
}
