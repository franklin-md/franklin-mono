// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ObsidianFileBadge } from '../obsidian-file-badge.js';

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
});
