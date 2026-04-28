import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Icons } from '../icons/registry.js';

describe('Icons', () => {
	it('keeps the Claude icon on its Anthropic brand color', () => {
		const { container } = render(
			<Icons.Claude className="text-muted-foreground" />,
		);

		const path = container.querySelector('path');

		expect(path?.getAttribute('fill')).toBe('#D97757');
	});
});
