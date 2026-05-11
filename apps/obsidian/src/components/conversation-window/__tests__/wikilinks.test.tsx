// @vitest-environment jsdom

import type { TextBlock } from '@franklin/extensions';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ObsidianText } from '../blocks.js';

afterEach(cleanup);

function renderText(text: string) {
	const block: TextBlock = {
		kind: 'text',
		text,
		startedAt: 0,
	};

	render(<ObsidianText block={block} />);
}

describe('Obsidian conversation wikilinks', () => {
	it('renders bare wikilinks as marker links', () => {
		renderText('See [[MEMORY]]');

		const link = screen.getByRole('button', { name: 'MEMORY' });
		expect(link.getAttribute('data-obsidian-linktext')).toBe('MEMORY');
	});

	it('uses alias text for display while preserving the link target', () => {
		renderText('Open [[notes/MEMORY#Overview|Read this note]]');

		const link = screen.getByRole('button', { name: 'Read this note' });
		expect(link.getAttribute('data-obsidian-linktext')).toBe(
			'notes/MEMORY#Overview',
		);
	});

	it('leaves incomplete wikilinks as plain text while streaming', () => {
		renderText('See [[MEM');

		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByText('See [[MEM')).toBeTruthy();
	});

	it('does not rewrite Obsidian embeds as note links', () => {
		renderText('Embed ![[MEMORY]]');

		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByText('Embed ![[MEMORY]]')).toBeTruthy();
	});
});
