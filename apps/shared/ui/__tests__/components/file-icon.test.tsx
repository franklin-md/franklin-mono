// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { FileIcon } from '../../src/components/file-icon/icon.js';

afterEach(cleanup);

describe('FileIcon', () => {
	describe('color behavior', () => {
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
			expect(icon?.style.color).toBe('rgb(49, 120, 198)');
		});

		it('applies brand color when requested for lucide entries', () => {
			const { container } = render(
				<FileIcon filename="document.pdf" withBrandColor />,
			);

			const icon = container.querySelector('svg');
			expect(icon?.getAttribute('stroke')).toBe('#E5252A');
		});

		it('does not override stroke for lucide entries with no brand color', () => {
			const { container } = render(
				<FileIcon filename="notes.txt" withBrandColor />,
			);

			const icon = container.querySelector('svg');
			expect(icon?.getAttribute('stroke')).toBe('currentColor');
		});

		it('does not override stroke when brand color is not requested', () => {
			const { container } = render(<FileIcon filename="document.pdf" />);

			const icon = container.querySelector('svg');
			expect(icon?.getAttribute('stroke')).toBe('currentColor');
		});

		it('does not apply a brand color for unknown extensions', () => {
			const { container } = render(
				<FileIcon filename="binary.unknown" withBrandColor />,
			);

			const icon = container.querySelector('svg');
			expect(icon?.getAttribute('stroke')).toBe('currentColor');
			expect(icon?.style.color).toBe('');
		});
	});

	describe('extension resolution', () => {
		it('uses an extension override for extensionless filenames', () => {
			const { container } = render(
				<FileIcon filename="session" extension="ts" withBrandColor />,
			);

			const icon = container.querySelector('svg');
			expect(icon?.style.color).toBe('rgb(49, 120, 198)');
		});

		it('prefers the override over the filename extension', () => {
			const { container } = render(
				<FileIcon filename="index.ts" extension="tsx" withBrandColor />,
			);

			// tsx → SiReact, brand color #61DAFB
			const icon = container.querySelector('svg');
			expect(icon?.style.color).toBe('rgb(97, 218, 251)');
		});

		it('normalizes a leading dot and case in the override', () => {
			const { container } = render(
				<FileIcon filename="x" extension=".TSX" withBrandColor />,
			);

			const icon = container.querySelector('svg');
			expect(icon?.style.color).toBe('rgb(97, 218, 251)');
		});

		it('falls back to the generic file icon for unknown extensions', () => {
			const { container } = render(<FileIcon filename="binary.unknown" />);

			const icon = container.querySelector('svg');
			expect(icon?.classList.contains('lucide-file')).toBe(true);
		});

		it('falls back to the generic file icon for extensionless filenames', () => {
			const { container } = render(<FileIcon filename="session" />);

			const icon = container.querySelector('svg');
			expect(icon?.classList.contains('lucide-file')).toBe(true);
		});
	});

	describe('whole-filename matches (FILENAME_ICONS)', () => {
		it('uses the docker icon for a file literally named Dockerfile', () => {
			const { container } = render(
				<FileIcon filename="Dockerfile" withBrandColor />,
			);

			const icon = container.querySelector('svg');
			// SiDocker, brand color #2496ED
			expect(icon?.style.color).toBe('rgb(36, 150, 237)');
		});

		it('matches whole-filename keys case-insensitively', () => {
			const { container } = render(
				<FileIcon filename="DOCKERFILE" withBrandColor />,
			);

			const icon = container.querySelector('svg');
			expect(icon?.style.color).toBe('rgb(36, 150, 237)');
		});

		it('uses the terminal icon for Makefile (no brand color)', () => {
			const { container } = render(
				<FileIcon filename="Makefile" withBrandColor />,
			);

			const icon = container.querySelector('svg');
			// Makefile → Terminal lucide, no brand color → stroke unchanged
			expect(icon?.getAttribute('stroke')).toBe('currentColor');
			expect(icon?.classList.contains('lucide-terminal')).toBe(true);
		});

		it('prefers an extension match over a whole-filename match', () => {
			const { container } = render(
				<FileIcon filename="Dockerfile" extension="ts" withBrandColor />,
			);

			const icon = container.querySelector('svg');
			// override 'ts' → SiTypescript, brand color #3178C6
			expect(icon?.style.color).toBe('rgb(49, 120, 198)');
		});

		it('still falls through to a whole-filename match when the override extension is unknown', () => {
			const { container } = render(
				<FileIcon filename="Dockerfile" extension="unknown" withBrandColor />,
			);

			const icon = container.querySelector('svg');
			expect(icon?.style.color).toBe('rgb(36, 150, 237)');
		});
	});

	describe('className', () => {
		it('always applies the shrink-0 class', () => {
			const { container } = render(<FileIcon filename="index.ts" />);

			const icon = container.querySelector('svg');
			expect(icon?.classList.contains('shrink-0')).toBe(true);
		});

		it('merges a caller className alongside shrink-0', () => {
			const { container } = render(
				<FileIcon filename="index.ts" className="h-3 w-3" />,
			);

			const icon = container.querySelector('svg');
			expect(icon?.classList.contains('shrink-0')).toBe(true);
			expect(icon?.classList.contains('h-3')).toBe(true);
			expect(icon?.classList.contains('w-3')).toBe(true);
		});
	});
});
