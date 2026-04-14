// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Favicon } from '../favicon.js';

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

	it('applies custom className', () => {
		const { container } = render(
			<Favicon hostname="example.com" className="custom-class" />,
		);
		const img = container.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.className).toContain('custom-class');
	});
});
