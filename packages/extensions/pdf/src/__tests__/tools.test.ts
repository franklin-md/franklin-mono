import { describe, expect, it } from 'vitest';

import { readPDFSpec } from '../tools.js';

describe('readPDFSpec', () => {
	it('accepts optional page range boundaries', () => {
		expect(readPDFSpec.schema.safeParse({ path: 'document.pdf' }).success).toBe(
			true,
		);
		expect(
			readPDFSpec.schema.safeParse({
				path: 'document.pdf',
				start_page: 2,
				end_page: 4,
			}).success,
		).toBe(true);
	});

	it('rejects invalid page range boundaries', () => {
		expect(
			readPDFSpec.schema.safeParse({
				path: 'document.pdf',
				start_page: 4,
				end_page: 2,
			}).success,
		).toBe(false);
		expect(
			readPDFSpec.schema.safeParse({
				path: 'document.pdf',
				start_page: 1.5,
			}).success,
		).toBe(false);
	});
});
