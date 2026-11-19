// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { listObsidianIcons } from '../icon/catalog.js';
import { ObsidianIcon } from '../icon/index.js';

afterEach(cleanup);

function iconClasses(container: HTMLElement) {
	return [...container.querySelectorAll('svg')].map((svg) =>
		svg.getAttribute('class'),
	);
}

it('lists registered icons with readable labels', () => {
	expect(listObsidianIcons()).toEqual([
		{ id: 'lucide-link', label: 'Link' },
		{ id: 'lucide-pencil', label: 'Pencil' },
		{ id: 'lucide-circle-help', label: 'Circle help' },
	]);
});

it('renders registered icons and replaces them when the ID changes', () => {
	const { container, rerender } = render(
		<ObsidianIcon id="lucide-link" className="size-4" />,
	);
	expect(iconClasses(container)).toEqual(['svg-icon lucide-link']);
	expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
	rerender(<ObsidianIcon id="lucide-pencil" className="size-4" />);
	expect(iconClasses(container)).toEqual(['svg-icon lucide-pencil']);
});

it('falls back when an icon is no longer registered', () => {
	const { container } = render(<ObsidianIcon id="removed-plugin-icon" />);
	expect(iconClasses(container)).toEqual(['svg-icon lucide-circle-help']);
});
