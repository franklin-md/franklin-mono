// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FileIcon } from '../../src/components/file-icon/icon.js';

describe('FileIcon', () => {
	it('inherits text color by default for react-icons entries', () => {
		const { container } = render(<FileIcon filename="index.ts" />);

		const icon = container.querySelector('svg');
		expect(icon).not.toBeNull();
		expect(icon?.style.color).toBe('');
	});

	it('applies brand color when requested for react-icons entries', () => {
		const { container } = render(
			<FileIcon filename="index.ts" withBrandColor />,
		);

		const icon = container.querySelector('svg');
		expect(icon).not.toBeNull();
		expect(icon?.style.color).toBe('rgb(49, 120, 198)');
	});

	it('uses an extension override for extensionless filenames', () => {
		const { container } = render(
			<FileIcon filename="session" extension="ts" withBrandColor />,
		);

		const icon = container.querySelector('svg');
		expect(icon).not.toBeNull();
		expect(icon?.style.color).toBe('rgb(49, 120, 198)');
	});

	it('applies brand color when requested for lucide entries', () => {
		const { container } = render(
			<FileIcon filename="document.pdf" withBrandColor />,
		);

		const icon = container.querySelector('svg');
		expect(icon).not.toBeNull();
		expect(icon?.getAttribute('stroke')).toBe('#E5252A');
	});
});
