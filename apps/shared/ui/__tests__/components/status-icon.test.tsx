// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusIcon, type StatusIconStatus } from '../../src/index.js';

const cases: Array<{
	status: StatusIconStatus;
	expectedClass: string;
}> = [
	{ status: 'in-progress', expectedClass: 'animate-spin' },
	{ status: 'success', expectedClass: 'text-emerald-500' },
	{ status: 'failure', expectedClass: 'text-destructive' },
	{ status: 'error', expectedClass: 'text-destructive' },
];

describe('StatusIcon', () => {
	it.each(cases)(
		'renders the $status icon treatment',
		({ status, expectedClass }) => {
			const { container } = render(
				<StatusIcon status={status} className="custom-class" />,
			);

			const svg = container.querySelector('svg');
			const className = svg?.getAttribute('class');

			expect(svg).not.toBeNull();
			expect(svg?.getAttribute('aria-hidden')).toBe('true');
			expect(className).toContain(expectedClass);
			expect(className).toContain('custom-class');
		},
	);
});
