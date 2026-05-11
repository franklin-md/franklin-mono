// @vitest-environment jsdom

import type { TextBlock } from '@franklin/extensions';
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import type { App } from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ObsidianAppContext } from '../../obsidian-app-context.js';
import { ObsidianText } from '../blocks.js';

afterEach(cleanup);

interface MockAppOptions {
	canonicalLinktext?: string;
	file?: unknown;
}

function createMockApp({
	canonicalLinktext = 'MEMORY',
	file = { path: 'MEMORY.md' },
}: MockAppOptions = {}) {
	const openLinkText = vi.fn().mockResolvedValue(undefined);
	const getFirstLinkpathDest = vi.fn().mockReturnValue(file);
	const fileToLinktext = vi.fn().mockReturnValue(canonicalLinktext);
	const app = {
		metadataCache: {
			fileToLinktext,
			getFirstLinkpathDest,
		},
		workspace: {
			openLinkText,
		},
	} as unknown as App;

	return { app, fileToLinktext, getFirstLinkpathDest, openLinkText };
}

function renderText(text: string, app?: App) {
	const block: TextBlock = {
		kind: 'text',
		text,
		startedAt: 0,
	};

	const content = <ObsidianText block={block} />;
	render(
		app ? (
			<ObsidianAppContext.Provider value={app}>
				{content}
			</ObsidianAppContext.Provider>
		) : (
			content
		),
	);
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

	it('opens clicked wikilinks through the Obsidian workspace', async () => {
		const { app, openLinkText } = createMockApp();
		renderText('See [[MEMORY]]', app);

		fireEvent.click(screen.getByRole('button', { name: 'MEMORY' }));

		await waitFor(() => {
			expect(openLinkText).toHaveBeenCalledWith('MEMORY', '', false);
		});
	});

	it('does not open missing wikilinks', async () => {
		const { app, getFirstLinkpathDest, openLinkText } = createMockApp({
			file: null,
		});
		renderText('See [[MEMORY]]', app);

		fireEvent.click(screen.getByRole('button', { name: 'MEMORY' }));

		await waitFor(() => {
			expect(getFirstLinkpathDest).toHaveBeenCalledWith('MEMORY', '');
		});
		expect(openLinkText).not.toHaveBeenCalled();
	});

	it('does not open ambiguous bare wikilinks', async () => {
		const { app, fileToLinktext, openLinkText } = createMockApp({
			canonicalLinktext: 'notes/MEMORY',
		});
		renderText('See [[MEMORY]]', app);

		fireEvent.click(screen.getByRole('button', { name: 'MEMORY' }));

		await waitFor(() => {
			expect(fileToLinktext).toHaveBeenCalled();
		});
		expect(openLinkText).not.toHaveBeenCalled();
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
