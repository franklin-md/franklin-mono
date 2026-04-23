import { describe, expect, it } from 'vitest';
import type { IncomingMessage } from 'node:http';

import { buildRequestUrl } from '../url.js';

function req(url: string | undefined): IncomingMessage {
	return { url } as IncomingMessage;
}

describe('buildRequestUrl', () => {
	it('composes host, port, path, and query', () => {
		expect(
			buildRequestUrl(req('/callback?code=1&state=x'), '127.0.0.1', 5123),
		).toBe('http://127.0.0.1:5123/callback?code=1&state=x');
	});

	it('uses "/" when req.url is undefined', () => {
		expect(buildRequestUrl(req(undefined), '127.0.0.1', 7000)).toBe(
			'http://127.0.0.1:7000/',
		);
	});

	it('preserves non-127 hosts verbatim', () => {
		expect(buildRequestUrl(req('/x'), 'localhost', 1234)).toBe(
			'http://localhost:1234/x',
		);
	});
});
