import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync('src/styles/utilities/shimmer.css', 'utf8');

describe('shimmer styles', () => {
	it('keeps text-fill opt-in separate from the animated shimmer context', () => {
		const shimmerRule = stylesheet.match(/\.shimmer\s+\{[^}]*\}/)?.[0];
		const shimmerableRule = stylesheet.match(
			/\.shimmer\s+\.shimmerable\s+\{[^}]*\}/,
		)?.[0];

		expect(shimmerRule).toContain('animation: shimmer');
		expect(shimmerRule).not.toContain('-webkit-text-fill-color');
		expect(shimmerableRule).toContain('-webkit-text-fill-color: transparent');
	});

	it('does not special-case individual utility classes', () => {
		expect(stylesheet).not.toContain('bg-accent');
	});
});
