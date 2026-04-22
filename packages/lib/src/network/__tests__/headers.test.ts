import { describe, expect, it } from 'vitest';
import { getHeader, setHeader } from '../headers.js';

describe('getHeader', () => {
	it('matches header names case-insensitively', () => {
		expect(
			getHeader(
				{
					'Content-Type': 'application/json',
				},
				'content-type',
			),
		).toBe('application/json');
	});

	it('returns undefined when the header is missing', () => {
		expect(getHeader(undefined, 'content-type')).toBeUndefined();
	});
});

describe('setHeader', () => {
	it('adds a header when the record is empty', () => {
		expect(setHeader(undefined, 'content-type', 'application/json')).toEqual({
			'content-type': 'application/json',
		});
	});

	it('replaces existing headers case-insensitively using the requested key', () => {
		expect(
			setHeader(
				{
					'Content-Type': 'text/plain',
					'content-type': 'application/xml',
					accept: 'text/html',
				},
				'content-type',
				'application/json',
			),
		).toEqual({
			accept: 'text/html',
			'content-type': 'application/json',
		});
	});

	it('does not mutate the original record', () => {
		const headers = {
			'Content-Type': 'text/plain',
		};

		const result = setHeader(headers, 'content-type', 'application/json');

		expect(headers).toEqual({
			'Content-Type': 'text/plain',
		});
		expect(result).toEqual({
			'content-type': 'application/json',
		});
	});
});
