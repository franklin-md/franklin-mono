import type { TextBlock } from '@franklin/extensions';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { App } from 'obsidian';

import { ObsidianAppProvider } from '../obsidian-app-context.js';
import { ObsidianText } from '../conversation-window/blocks.js';

// TODO(FRA-193): Move these Storybook Obsidian app utilities into the shared
// mock once the Obsidian API surface is modeled more completely.
interface WikilinkMarkdownStoryProps {
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

function WikilinkMarkdownStory({ text }: WikilinkMarkdownStoryProps) {
	const block: TextBlock = {
		kind: 'text',
		text,
		startedAt: 0,
	};

	return (
		<ObsidianAppProvider value={storyApp}>
			<div className="max-w-3xl">
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
