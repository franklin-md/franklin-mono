// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ObsidianFileBadge } from '../obsidian-file-badge.js';

vi.mock('@franklin/ui', () => ({
	FileBadge({ path, iconExtension }: { path: string; iconExtension?: string }) {
		const name = path.split('/').pop() ?? path;
		return (
			<span data-icon-extension={iconExtension ?? ''} data-testid="file-badge">
				{name}
			</span>
		);
	},
}));

afterEach(cleanup);

describe('ObsidianFileBadge', () => {
	it('renders the basename for a normal path', () => {
		render(<ObsidianFileBadge path="packages/agent/src/session.ts" />);

		expect(screen.getByText('session.ts')).toBeTruthy();
	});

	it('renders the target name for a wikilink path', () => {
		render(<ObsidianFileBadge path="[[MEMORY]]" />);

		expect(screen.getByText('MEMORY')).toBeTruthy();
		expect(screen.queryByText('[[MEMORY]]')).toBeNull();
	});

	it('uses the Markdown icon extension for wikilink paths', () => {
		render(<ObsidianFileBadge path="[[MEMORY]]" />);

		expect(
			screen.getByTestId('file-badge').getAttribute('data-icon-extension'),
		).toBe('md');
	});

	it('renders the basename for a nested wikilink path', () => {
		render(<ObsidianFileBadge path="[[notes/MEMORY.md]]" />);

		expect(screen.getByText('MEMORY.md')).toBeTruthy();
	});

	it('ignores wikilink heading and alias syntax for file badges', () => {
		render(
			<ObsidianFileBadge path="[[notes/MEMORY#Overview|Read this note]]" />,
		);

		expect(screen.getByText('MEMORY')).toBeTruthy();
	});

	it('falls back to the raw path for invalid empty wikilinks', () => {
		render(<ObsidianFileBadge path="[[]]" />);

		expect(screen.getByText('[[]]')).toBeTruthy();
	});

	it('does not use the Markdown icon extension for normal paths', () => {
		render(<ObsidianFileBadge path="packages/agent/src/session.ts" />);

		expect(
			screen.getByTestId('file-badge').getAttribute('data-icon-extension'),
		).toBe('');
	});
});
