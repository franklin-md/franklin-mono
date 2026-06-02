import { describe, expect, it } from 'vitest';

import { detectFileType } from '../supported.js';

describe('detectFileType', () => {
	it('detects supported PDF and image signatures', () => {
		const pdf = new TextEncoder().encode('%PDF-1.7\n');
		const png = Uint8Array.from([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]);

		expect(detectFileType(pdf)).toEqual({ mime: 'application/pdf' });
		expect(detectFileType(png)).toEqual({ mime: 'image/png' });
	});

	it('keeps known unsupported signatures distinct from text', () => {
		const zip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04]);

		expect(detectFileType(zip)).toEqual({ mime: 'application/zip' });
	});
});
