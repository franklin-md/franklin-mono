// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FileBadge } from '../../src/components/file-icon/badge.js';

vi.mock('../../src/components/file-icon/icon.js', () => ({
	FileIcon({
		filename,
		extension,
		className,
	}: {
		filename: string;
		extension?: string;
		className?: string;
	}) {
		return (
			<span
				className={className}
				data-extension={extension ?? ''}
				data-filename={filename}
				data-testid="file-icon"
			/>
		);
	},
}));

afterEach(cleanup);

describe('FileBadge', () => {
	it('renders the basename and resolves its extension from the path', () => {
		render(<FileBadge path="notes/MEMORY.md" />);

		expect(screen.getByText('MEMORY.md')).toBeTruthy();
		expect(screen.getByTestId('file-icon').getAttribute('data-filename')).toBe(
			'MEMORY.md',
		);
		expect(screen.getByTestId('file-icon').getAttribute('data-extension')).toBe(
			'md',
		);
	});

	it('uses iconExtension for icon resolution without changing the label', () => {
		render(<FileBadge path="notes/MEMORY" iconExtension="md" />);

		expect(screen.getByText('MEMORY')).toBeTruthy();
		expect(screen.getByTestId('file-icon').getAttribute('data-filename')).toBe(
			'MEMORY',
		);
		expect(screen.getByTestId('file-icon').getAttribute('data-extension')).toBe(
			'md',
		);
	});
});
