import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync('src/styles/utilities/shimmer.css', 'utf8');

describe('shimmer styles', () => {
	it('keeps shimmer context separate from text fill opt-in', () => {
		const shimmerRule = stylesheet.match(/\.shimmer\s+\{[^}]*\}/)?.[0];
		const shimmerableRule = stylesheet.match(
			/\.shimmer\s+\.shimmerable\s+\{[^}]*\}/,
		)?.[0];

		expect(shimmerRule).toContain('--shimmer-period');
		expect(shimmerRule).not.toContain('-webkit-text-fill-color');
		expect(shimmerableRule).toContain('background-image: linear-gradient');
		expect(shimmerableRule).toContain('background-clip: text');
		expect(shimmerableRule).toContain('-webkit-background-clip: text');
		expect(shimmerableRule).toContain('background-attachment: fixed');
		expect(shimmerableRule).toContain('animation: shimmer');
		expect(shimmerableRule).toContain('-webkit-text-fill-color: transparent');
	});

	it('does not special-case individual utility classes', () => {
		expect(stylesheet).not.toContain('bg-accent');
	});
});
