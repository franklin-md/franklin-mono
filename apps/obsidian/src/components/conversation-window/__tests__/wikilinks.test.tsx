// @vitest-environment jsdom

import type { TextBlock } from '@franklin/agent';
import { formatReferenceMention } from '@franklin/agent';
import { getConversationRenderTurn } from '@franklin/react';
import { Markdown } from '@franklin/ui';
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
import { ObsidianText, ObsidianThinking } from '../blocks.js';
import { ObsidianUserMessage } from '../user-message.js';
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
	return render(
		<ObsidianAppProvider value={app}>{content}</ObsidianAppProvider>,
	);
}

describe('Obsidian conversation Markdown', () => {
	it('preserves note URLs without web-link decoration', () => {
		const href = 'obsidian://open?vault=Obsidian&file=Thread%20Coarsening.md';
		const { container } = renderText(
			`In [your coarsening example](${href}), reuse A.`,
		);

		const link = screen.getByRole('link', { name: 'your coarsening example' });
		expect(link.getAttribute('href')).toBe(href);
		expect(link.getAttribute('target')).toBeNull();
		expect(link.getAttribute('rel')).toBeNull();
		expect(link.querySelector('img')).toBeNull();
		expect(container.textContent).not.toContain('[blocked]');
	});

	it('preserves note URLs alongside declared wikilinks', () => {
		const href = 'obsidian://open?vault=Obsidian&file=Notes%2FExample.md';
		renderText(`See [[MEMORY]] and [Note](${href})`);

		expect(screen.getByRole('button', { name: '[[MEMORY]]' })).toBeTruthy();
		expect(
			screen.getByRole('link', { name: 'Note' }).getAttribute('href'),
		).toBe(href);
	});

	it('preserves note URLs in expanded thinking blocks', () => {
		const href = 'obsidian://open?vault=Obsidian&file=Example.md';
		render(
			<ObsidianThinking
				block={{ kind: 'thinking', text: `[Note](${href})`, startedAt: 0 }}
			/>,
		);

		expect(
			screen.getByRole('link', { name: 'Note' }).getAttribute('href'),
		).toBe(href);
	});

	it('preserves note URLs and file references in user messages', () => {
		const href = 'obsidian://open?vault=Obsidian&file=Example.md';
		const mention = formatReferenceMention({ locator: 'notes/deep work.md' });
		const turn = getConversationRenderTurn(
			{
				id: 'turn-1',
				timestamp: 0,
				prompt: {
					role: 'user',
					content: [{ type: 'text', text: `[Note](${href}) ${mention}` }],
				},
				response: { blocks: [] },
			},
			0,
			true,
			0,
		);
		render(<ObsidianUserMessage turn={turn} />);

		expect(
			screen.getByRole('link', { name: 'Note' }).getAttribute('href'),
		).toBe(href);
		expect(screen.getByText('deep work.md')).toBeTruthy();
		expect(screen.queryByText(mention)).toBeNull();
	});

	it('keeps the host protocol policy out of unconfigured shared Markdown', () => {
		const href = 'obsidian://open?vault=Obsidian&file=Example.md';
		renderText(`[Host note](${href})`);
		const { container } = render(<Markdown text={`[Shared note](${href})`} />);

		expect(screen.getByRole('link', { name: 'Host note' })).toBeTruthy();
		expect(container.querySelector('a')).toBeNull();
		expect(container.textContent).toContain('Shared note [blocked]');
	});

	it('preserves default telephone links', () => {
		renderText('[Call](tel:+442012345678)');

		expect(
			screen.getByRole('link', { name: 'Call' }).getAttribute('href'),
		).toBe('tel:+442012345678');
	});

	it.each([
		'javascript:alert%281%29',
		'data:text/html,unsafe',
		'file:///etc/passwd',
		'vbscript:msgbox%281%29',
		'unknown-app://open',
	])('blocks unsafe or unsupported URLs: %s', (href) => {
		const { container } = renderText(
			`[Unsafe](${href}) <a href="${href}">Unsafe HTML</a>`,
		);

		expect(container.querySelector('a')).toBeNull();
		expect(container.textContent).toContain('Unsafe [blocked]');
		expect(container.textContent).toContain('Unsafe HTML [blocked]');
	});

	it('strips scripts, event handlers and undeclared wikilink attributes', () => {
		const { container } = renderText(
			'<script>alert(1)</script>\n\n<a href="obsidian://open?vault=Obsidian&file=Example.md" onclick="alert(1)">Note</a>\n\n<obsidian-wikilink linktext="MEMORY" onclick="alert(1)" data-blocked="stripped">Memory</obsidian-wikilink>',
		);

		expect(
			screen.getByRole('link', { name: 'Note' }).getAttribute('onclick'),
		).toBeNull();
		expect(screen.getByRole('button', { name: '[[Memory]]' })).toBeTruthy();
		expect(container.querySelector('script')).toBeNull();
		expect(container.querySelector('[onclick], [data-blocked]')).toBeNull();
	});
});

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
