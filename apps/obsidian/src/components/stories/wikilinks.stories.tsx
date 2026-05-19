import type { TextBlock } from '@franklin/agent';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { App } from 'obsidian';
import { expect, waitFor, within } from 'storybook/test';

import { ObsidianAppProvider } from '../obsidian-app-context.js';
import { ObsidianText } from '../conversation-window/blocks.js';

// TODO(FRA-193): Move these Storybook Obsidian app utilities into the shared
// mock once the Obsidian API surface is modeled more completely.
interface WikilinkMarkdownStoryProps {
	containerClassName?: string;
	text: string;
}

interface StoryFile {
	basename: string;
	extension: 'md';
	name: string;
	path: string;
}

const wikilinkMarkdown = [
	'# Header with [[Daily Note]] and [[Missing Note]]',
	'',
	'- Existing file: [[Daily Note]]',
	'- Missing file: [[Missing Note]]',
	"- Alias: [[Daily Note|today's note]]",
	'- Fragment: [[Daily Note#Review]]',
	'- Fragment with alias: [[Projects/Franklin#Next steps|Franklin next steps]]',
].join('\n');

const storyApp = createStoryApp([
	createStoryFile('Daily Note.md'),
	createStoryFile('Projects/Franklin.md'),
]);

const meta = {
	title: 'Obsidian/Wikilinks',
	component: WikilinkMarkdownStory,
	args: {
		text: wikilinkMarkdown,
	},
} satisfies Meta<typeof WikilinkMarkdownStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MarkdownText: Story = {};

export const LinkThemeAndTypography: Story = {
	args: {
		text: wikilinkMarkdown,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const activeDocument = canvasElement.ownerDocument;
		const header = canvas.getByRole('heading', { level: 1 });
		const resolvedHeaderLink = within(header).getByRole('button', {
			name: '[[Daily Note]]',
		});
		const unresolvedHeaderLink = within(header).getByRole('button', {
			name: '[[Missing Note]]',
		});

		await waitFor(async () => {
			const headerStyle = getComputedStyle(header);
			const resolvedStyle = getComputedStyle(resolvedHeaderLink);
			const unresolvedStyle = getComputedStyle(unresolvedHeaderLink);

			await expect(resolvedStyle.color).toBe(
				getResolvedBodyColorVariable(activeDocument, '--link-color'),
			);
			await expect(unresolvedStyle.color).toBe(
				getResolvedBodyColorVariable(activeDocument, '--link-unresolved-color'),
			);
			await expect(resolvedStyle.color).not.toBe(headerStyle.color);
			await expect(resolvedStyle.fontSize).toBe(headerStyle.fontSize);
			await expect(resolvedStyle.lineHeight).toBe(headerStyle.lineHeight);
			await expect(
				resolvedHeaderLink.getBoundingClientRect().height,
			).toBeCloseTo(parseFloat(headerStyle.lineHeight), 1);
		});
	},
};

export const LongPathWrapping: Story = {
	args: {
		containerClassName: 'w-64 max-w-64',
		text: 'Write it in: [[Library/Literature Notes/Programming Language Abstractions for Extensible Systems]]',
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const container = canvas.getByTestId('wikilink-story-container');
		const link = canvas.getByRole('button', {
			name: '[[Library/Literature Notes/Programming Language Abstractions for Extensible Systems]]',
		});

		await waitFor(async () => {
			const containerRect = container.getBoundingClientRect();
			const linkRect = link.getBoundingClientRect();

			await expect(linkRect.width).toBeLessThanOrEqual(containerRect.width + 1);
			await expect(container.scrollWidth).toBeLessThanOrEqual(
				container.clientWidth + 1,
			);
		});
	},
};

function WikilinkMarkdownStory({
	containerClassName = 'max-w-3xl',
	text,
}: WikilinkMarkdownStoryProps) {
	const block: TextBlock = {
		kind: 'text',
		text,
		startedAt: 0,
	};

	return (
		<ObsidianAppProvider value={storyApp}>
			<div
				className={containerClassName}
				data-testid="wikilink-story-container"
			>
				<ObsidianText block={block} />
			</div>
		</ObsidianAppProvider>
	);
}

function createStoryApp(files: StoryFile[]): App {
	const filesByLinkpath = new Map(
		files.map((file) => [getLinktextForFile(file), file]),
	);

	return {
		metadataCache: {
			fileToLinktext: (file: StoryFile) => getLinktextForFile(file),
			getFirstLinkpathDest: (linkpath: string) =>
				filesByLinkpath.get(linkpath) ?? null,
		},
		workspace: {
			openLinkText: async () => {},
		},
	} as unknown as App;
}

function createStoryFile(path: string): StoryFile {
	const name = path.split('/').at(-1) ?? path;
	const basename = name.replace(/\.md$/i, '');

	return {
		basename,
		extension: 'md',
		name,
		path,
	};
}

function getLinktextForFile(file: StoryFile) {
	return file.path.replace(/\.md$/i, '');
}

function getResolvedBodyColorVariable(
	activeDocument: Document,
	variableName: `--${string}`,
) {
	// Obsidian variables often point at other variables; resolving through a
	// real color property matches what the wikilink utility actually computes.
	// Storybook runs in a browser without Obsidian's createSpan DOM extension.
	// eslint-disable-next-line obsidianmd/prefer-create-el
	const probe = activeDocument.createElement('span');
	probe.style.color = `var(${variableName})`;
	activeDocument.body.append(probe);

	const color = getComputedStyle(probe).color;
	probe.remove();

	return color;
}
