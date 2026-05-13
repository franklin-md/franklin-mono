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
import { Keymap } from 'obsidian';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ObsidianAppProvider } from '../../obsidian-app-context.js';
import { ObsidianText } from '../blocks.js';
import { ObsidianWikilink } from '../wikilinks/link.js';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

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

function renderText(text: string, app: App = createMockApp().app) {
	const block: TextBlock = {
		kind: 'text',
		text,
		startedAt: 0,
	};

	const content = <ObsidianText block={block} />;
	render(<ObsidianAppProvider value={app}>{content}</ObsidianAppProvider>);
}

describe('Obsidian conversation wikilinks', () => {
	it('renders bare wikilinks as marker links', () => {
		renderText('See [[MEMORY]]');

		const link = screen.getByRole('button', { name: '[[MEMORY]]' });
		expect(link.getAttribute('data-obsidian-linktext')).toBe('MEMORY');
	});

	it('uses Obsidian link variables without relying on internal-link classes', () => {
		renderText('See [[MEMORY]]');

		const link = screen.getByRole('button', { name: '[[MEMORY]]' });
		expect(link.classList.contains('internal-link')).toBe(false);
		expect(link.classList.contains('text-inherit')).toBe(true);
		expect(link.classList.contains('[font:inherit]')).toBe(true);
		expect(link.classList.contains('![color:var(--link-color)]')).toBe(true);
		expect(link.classList.contains('![font-weight:var(--link-weight)]')).toBe(
			true,
		);
		expect(link.classList.contains('font-medium')).toBe(false);
		expect(link.classList.contains('text-primary')).toBe(false);
	});

	it('uses Obsidian unresolved link variables for missing wikilinks', () => {
		const { app } = createMockApp({ file: null });
		renderText('See [[MEMORY]]', app);

		const link = screen.getByRole('button', { name: '[[MEMORY]]' });
		expect(link.classList.contains('![color:var(--link-color)]')).toBe(false);
		expect(
			link.classList.contains('![color:var(--link-unresolved-color)]'),
		).toBe(true);
		expect(
			link.classList.contains('![opacity:var(--link-unresolved-opacity)]'),
		).toBe(true);
	});

	it('uses Obsidian unresolved link variables for ambiguous wikilinks', () => {
		const { app } = createMockApp({ canonicalLinktext: 'notes/MEMORY' });
		renderText('See [[MEMORY]]', app);

		const link = screen.getByRole('button', { name: '[[MEMORY]]' });
		expect(link.classList.contains('![color:var(--link-color)]')).toBe(false);
		expect(
			link.classList.contains('![color:var(--link-unresolved-color)]'),
		).toBe(true);
	});

	it('uses alias text for display while preserving the link target', () => {
		renderText('Open [[notes/MEMORY#Overview|Read this note]]');

		const link = screen.getByRole('button', { name: '[[Read this note]]' });
		expect(link.getAttribute('data-obsidian-linktext')).toBe(
			'notes/MEMORY#Overview',
		);
	});

	it('renders multiple wikilinks from the same text node', () => {
		renderText('See [[MEMORY]] and [[notes/PROJECT|Project]]');

		expect(screen.getByRole('button', { name: '[[MEMORY]]' })).toBeTruthy();
		expect(screen.getByRole('button', { name: '[[Project]]' })).toBeTruthy();
	});

	it('opens clicked wikilinks through the Obsidian workspace', async () => {
		const { app, openLinkText } = createMockApp();
		renderText('See [[MEMORY]]', app);

		fireEvent.click(screen.getByRole('button', { name: '[[MEMORY]]' }));

		await waitFor(() => {
			expect(openLinkText).toHaveBeenCalledWith('MEMORY', '', false);
		});
	});

	it('opens mod-clicked wikilinks in a new tab', async () => {
		const { app, openLinkText } = createMockApp();
		renderText('See [[MEMORY]]', app);

		fireEvent.click(screen.getByRole('button', { name: '[[MEMORY]]' }), {
			ctrlKey: true,
		});

		await waitFor(() => {
			expect(openLinkText).toHaveBeenCalledWith('MEMORY', '', 'tab');
		});
	});

	it('uses the Obsidian keymap to choose the pane target', async () => {
		const { app, openLinkText } = createMockApp();
		const isModEvent = vi.spyOn(Keymap, 'isModEvent').mockReturnValue('window');
		renderText('See [[MEMORY]]', app);

		fireEvent.click(screen.getByRole('button', { name: '[[MEMORY]]' }));

		await waitFor(() => {
			expect(isModEvent).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'click' }),
			);
			expect(openLinkText).toHaveBeenCalledWith('MEMORY', '', 'window');
		});
	});

	it('uses the semantic linktext prop as the link target', async () => {
		const { app, openLinkText } = createMockApp();
		render(
			<ObsidianAppProvider value={app}>
				<ObsidianWikilink linktext="MEMORY">Memory note</ObsidianWikilink>
			</ObsidianAppProvider>,
		);

		const link = screen.getByRole('button', { name: '[[Memory note]]' });
		expect(link.getAttribute('data-obsidian-linktext')).toBe('MEMORY');
		fireEvent.click(link);

		await waitFor(() => {
			expect(openLinkText).toHaveBeenCalledWith('MEMORY', '', false);
		});
	});

	it('does not open missing wikilinks', async () => {
		const { app, getFirstLinkpathDest, openLinkText } = createMockApp({
			file: null,
		});
		renderText('See [[MEMORY]]', app);

		fireEvent.click(screen.getByRole('button', { name: '[[MEMORY]]' }));

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

		fireEvent.click(screen.getByRole('button', { name: '[[MEMORY]]' }));

		await waitFor(() => {
			expect(fileToLinktext).toHaveBeenCalled();
		});
		expect(openLinkText).not.toHaveBeenCalled();
	});

	it('renders incomplete wikilinks as transient marker links while streaming', () => {
		renderText('See [[MEM');

		const link = screen.getByRole('button', { name: '[[MEM]]' });
		expect(link.getAttribute('data-obsidian-linktext')).toBe('MEM');
	});

	it('does not rewrite incomplete Obsidian embeds as note links', () => {
		renderText('Embed ![[MEM');

		expect(screen.queryByRole('button')).toBeNull();
		expect(screen.getByText('Embed ![[MEM]]')).toBeTruthy();
	});

	it('does not rewrite Obsidian embeds as note links', () => {
		renderText('Embed ![[MEMORY]]');

		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByText('Embed ![[MEMORY]]')).toBeTruthy();
	});

	it('does not rewrite wikilinks inside inline code', () => {
		renderText('Use `[[MEMORY]]`');

		expect(screen.queryByRole('button')).toBeNull();
		expect(screen.getByText('[[MEMORY]]')).toBeTruthy();
	});

	it('does not rewrite wikilinks inside code blocks', () => {
		renderText('```\n[[MEMORY]]\n```');

		expect(screen.queryByRole('button', { name: '[[MEMORY]]' })).toBeNull();
		expect(screen.getByText('[[MEMORY]]')).toBeTruthy();
	});

	it('does not rewrite wikilinks inside markdown links', () => {
		renderText('[See [[MEMORY]]](https://example.com)');

		const link = screen.getByRole('link', { name: 'See [[MEMORY]]' });

		expect(screen.queryByRole('button')).toBeNull();
		expect(link.getAttribute('href')).toBe('https://example.com/');
	});
});
