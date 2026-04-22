import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';

import { readBody } from '../read-body.js';

function makeRequest(
	method: string,
	chunks: Array<string | Buffer> = [],
): IncomingMessage {
	const readable = Readable.from(
		chunks.map((c) => (typeof c === 'string' ? Buffer.from(c, 'utf8') : c)),
	);
	Object.assign(readable, { method });
	return readable as unknown as IncomingMessage;
}

describe('readBody', () => {
	it('returns undefined for GET requests without reading the stream', async () => {
		expect(await readBody(makeRequest('GET', ['ignored']))).toBeUndefined();
	});

	it('returns undefined for HEAD requests', async () => {
		expect(await readBody(makeRequest('HEAD'))).toBeUndefined();
	});

	it('returns undefined when the body is empty', async () => {
		expect(await readBody(makeRequest('POST'))).toBeUndefined();
	});

	it('concatenates multi-chunk bodies as utf-8', async () => {
		const body = await readBody(makeRequest('POST', ['hel', 'lo']));
		expect(body).toBe('hello');
	});

	it('decodes non-ASCII utf-8 correctly across chunk boundaries', async () => {
		const full = Buffer.from('héllo 🌊', 'utf8');
		const mid = Math.floor(full.length / 2);
		const body = await readBody(
			makeRequest('POST', [full.subarray(0, mid), full.subarray(mid)]),
		);
		expect(body).toBe('héllo 🌊');
	});
});
