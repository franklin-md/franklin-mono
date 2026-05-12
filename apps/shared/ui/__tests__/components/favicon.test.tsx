// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Favicon } from '../../src/components/favicon.js';

describe('Favicon', () => {
	it('renders an img with the correct src', () => {
		const { container } = render(<Favicon hostname="example.com" />);
		const img = container.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.getAttribute('src')).toBe(
			'https://www.google.com/s2/favicons?domain=example.com&sz=16',
		);
	});

	it('has empty alt text for decorative purpose', () => {
		const { container } = render(<Favicon hostname="example.com" />);
		const img = container.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.getAttribute('alt')).toBe('');
	});

	it('uses typography-relative sizing by default', () => {
		const { container } = render(<Favicon hostname="example.com" />);
		const img = container.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.className).toContain('size-[0.9em]');
		expect(img?.className).toContain('align-[-0.1em]');
		expect(img?.className).not.toContain('h-3.5');
		expect(img?.className).not.toContain('w-3.5');
	});

	it('applies custom className', () => {
		const { container } = render(
			<Favicon hostname="example.com" className="custom-class" />,
		);
		const img = container.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.className).toContain('custom-class');
	});
});
