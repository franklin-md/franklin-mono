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

	it('renders a top-level filename without a directory prefix', () => {
		render(<FileBadge path="README.md" />);

		expect(screen.getByText('README.md')).toBeTruthy();
		expect(screen.getByTestId('file-icon').getAttribute('data-filename')).toBe(
			'README.md',
		);
		expect(screen.getByTestId('file-icon').getAttribute('data-extension')).toBe(
			'md',
		);
	});

	it('strips a deeply nested directory and forwards the basename', () => {
		render(<FileBadge path="a/b/c/d/e/file.ts" />);

		expect(screen.getByText('file.ts')).toBeTruthy();
		expect(screen.getByTestId('file-icon').getAttribute('data-filename')).toBe(
			'file.ts',
		);
		expect(screen.getByTestId('file-icon').getAttribute('data-extension')).toBe(
			'ts',
		);
	});

	it('does not parse wikilink syntax — that lives in the obsidian wrapper', () => {
		render(<FileBadge path="[[MEMORY]]" />);

		expect(screen.getByText('[[MEMORY]]')).toBeTruthy();
		expect(screen.getByTestId('file-icon').getAttribute('data-filename')).toBe(
			'[[MEMORY]]',
		);
		// '[[MEMORY]]' has no recognizable extension
		expect(screen.getByTestId('file-icon').getAttribute('data-extension')).toBe(
			'',
		);
	});

	it('lowercases an upper-case iconExtension override', () => {
		render(<FileBadge path="notes/MEMORY" iconExtension="MD" />);

		expect(screen.getByTestId('file-icon').getAttribute('data-extension')).toBe(
			'md',
		);
	});

	it('strips a leading dot in the iconExtension override', () => {
		render(<FileBadge path="notes/MEMORY" iconExtension=".md" />);

		expect(screen.getByTestId('file-icon').getAttribute('data-extension')).toBe(
			'md',
		);
	});

	it('forwards no extension when the path has none and no override is given', () => {
		render(<FileBadge path="notes/MEMORY" />);

		expect(screen.getByTestId('file-icon').getAttribute('data-extension')).toBe(
			'',
		);
	});

	it('lowercases an upper-case extension on the source path', () => {
		render(<FileBadge path="notes/README.MD" />);

		expect(screen.getByText('README.MD')).toBeTruthy();
		expect(screen.getByTestId('file-icon').getAttribute('data-extension')).toBe(
			'md',
		);
	});
});
