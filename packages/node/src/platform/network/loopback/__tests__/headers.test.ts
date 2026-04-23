import { describe, expect, it } from 'vitest';

import { normalizeHeaders } from '../headers.js';

describe('normalizeHeaders', () => {
	it('returns an empty object when no headers are present', () => {
		expect(normalizeHeaders({})).toEqual({});
	});

	it('passes single-valued string headers through unchanged', () => {
		expect(normalizeHeaders({ 'x-token': 'abc', accept: 'text/html' })).toEqual(
			{
				'x-token': 'abc',
				accept: 'text/html',
			},
		);
	});

	it('joins array-valued headers with a comma and space', () => {
		expect(normalizeHeaders({ 'set-cookie': ['a=1', 'b=2'] })).toEqual({
			'set-cookie': 'a=1, b=2',
		});
	});

	it('skips headers whose value is undefined', () => {
		expect(normalizeHeaders({ present: 'yes', missing: undefined })).toEqual({
			present: 'yes',
		});
	});
});
