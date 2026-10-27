import { readFile, stat, utimes } from 'node:fs/promises';
import type { WebFetchResponse } from '@franklin/lib';
import { cacheHash } from './hash.js';

export async function readCachedResponse(
	path: string,
	maxBytes: number,
): Promise<WebFetchResponse | undefined> {
	if ((await stat(path)).size > maxBytes) return undefined;
	const file = await readFile(path);
	if (file.length < 4) return undefined;
	const offset = 4 + file.readUInt32BE(0);
	if (offset > file.length) return undefined;
	const metadata: unknown = JSON.parse(file.toString('utf8', 4, offset));
	if (
		typeof metadata !== 'object' ||
		metadata === null ||
		!('version' in metadata) ||
		metadata.version !== 1 ||
		!('expiresAt' in metadata) ||
		typeof metadata.expiresAt !== 'number' ||
		!Number.isFinite(metadata.expiresAt) ||
		metadata.expiresAt <= Date.now() ||
		!('digest' in metadata) ||
		metadata.digest !== cacheHash(file.subarray(offset)) ||
		!('response' in metadata)
	)
		return undefined;
	const response = metadata.response;
	if (
		typeof response !== 'object' ||
		response === null ||
		!('url' in response) ||
		typeof response.url !== 'string' ||
		!('status' in response) ||
		response.status !== 200 ||
		!('statusText' in response) ||
		typeof response.statusText !== 'string' ||
		!('headers' in response) ||
		typeof response.headers !== 'object' ||
		response.headers === null ||
		!Object.values(response.headers).every((value) => typeof value === 'string')
	)
		return undefined;
	const time = new Date(Date.now());
	await utimes(path, time, time);
	return {
		url: response.url,
		status: response.status,
		statusText: response.statusText,
		headers: response.headers as Record<string, string>,
		body: file.subarray(offset),
	};
}
