import { requestUrl, type RequestUrlParam } from 'obsidian';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { obsidianFetch } from '../fetch.js';

describe('obsidianFetch', () => {
	beforeEach(() => {
		vi.mocked(requestUrl).mockReset();
	});

	afterEach(() => {
		vi.mocked(requestUrl).mockReset();
	});

	it('issues requestUrl with throw disabled', async () => {
		vi.mocked(requestUrl).mockResolvedValue({
			status: 200,
			headers: {},
			arrayBuffer: new Uint8Array().buffer,
			json: null,
			text: 'ok',
		});

		await obsidianFetch({
			url: 'https://example.com/api',
			method: 'GET',
			headers: { 'user-agent': 'test' },
		});

		expect(requestUrl).toHaveBeenCalledWith(
			expect.objectContaining({
				url: 'https://example.com/api',
				method: 'GET',
				headers: { 'user-agent': 'test' },
				throw: false,
			}),
		);
	});

	it('passes Uint8Array bodies through to requestUrl as ArrayBuffer', async () => {
		const body = new TextEncoder().encode('{"hello":"world"}');
		vi.mocked(requestUrl).mockResolvedValue({
			status: 200,
			headers: {},
			arrayBuffer: new Uint8Array().buffer,
			json: null,
			text: 'ok',
		});

		await obsidianFetch({
			url: 'https://example.com/',
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
		});

		const [request] = vi.mocked(requestUrl).mock.calls[0] ?? [];
		expect(typeof request).toBe('object');
		const requestParam = request as RequestUrlParam;
		expect(requestParam).toEqual(
			expect.objectContaining({
				method: 'POST',
				contentType: 'application/json',
			}),
		);
		expect(requestParam.body).toBeInstanceOf(ArrayBuffer);
		expect(
			new TextDecoder().decode(
				new Uint8Array(requestParam.body as ArrayBuffer),
			),
		).toBe('{"hello":"world"}');
	});

	it('maps requestUrl responses to WebFetchResponse', async () => {
		vi.mocked(requestUrl).mockResolvedValue({
			status: 201,
			headers: { 'Content-Type': 'application/json' },
			arrayBuffer: new TextEncoder().encode('hello').buffer,
			json: null,
			text: 'hello',
		});

		const response = await obsidianFetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(201);
		expect(response.statusText).toBe('');
		expect(response.headers['content-type']).toBe('application/json');
		expect(response.body).toBeInstanceOf(Uint8Array);
		expect(new TextDecoder().decode(response.body)).toBe('hello');
	});

	it('surfaces non-2xx responses as data', async () => {
		vi.mocked(requestUrl).mockResolvedValue({
			status: 500,
			headers: {},
			arrayBuffer: new TextEncoder().encode('oops').buffer,
			json: null,
			text: 'oops',
		});

		const response = await obsidianFetch({
			url: 'https://example.com/',
			method: 'GET',
		});

		expect(response.status).toBe(500);
		expect(response.statusText).toBe('');
		expect(new TextDecoder().decode(response.body)).toBe('oops');
	});
});
