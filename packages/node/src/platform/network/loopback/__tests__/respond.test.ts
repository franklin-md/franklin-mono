import { describe, expect, it, vi } from 'vitest';
import type { ServerResponse } from 'node:http';

import { writeResponse } from '../respond.js';

function mockResponse() {
	const headers = new Map<string, string>();
	const res = {
		statusCode: 0,
		setHeader: vi.fn((key: string, value: string) => {
			headers.set(key, value);
		}),
		end: vi.fn(),
	};
	return { res: res as unknown as ServerResponse, headers, spy: res };
}

describe('writeResponse', () => {
	it('sets the status code', () => {
		const { res, spy } = mockResponse();
		writeResponse(res, { status: 302 });
		expect(spy.statusCode).toBe(302);
	});

	it('sets each provided header', () => {
		const { res, headers, spy } = mockResponse();
		writeResponse(res, {
			status: 200,
			headers: { 'content-type': 'text/html', location: '/x' },
		});
		expect(headers.get('content-type')).toBe('text/html');
		expect(headers.get('location')).toBe('/x');
		expect(spy.setHeader).toHaveBeenCalledTimes(2);
	});

	it('writes the provided body', () => {
		const { res, spy } = mockResponse();
		writeResponse(res, { status: 200, body: 'hello' });
		expect(spy.end).toHaveBeenCalledWith('hello');
	});

	it('writes an empty body when body is undefined', () => {
		const { res, spy } = mockResponse();
		writeResponse(res, { status: 204 });
		expect(spy.end).toHaveBeenCalledWith('');
	});
});
