import { TextBlock, ThinkingBlock } from '@franklin/ui';

import type { TextBlock as TextBlockData } from '@franklin/agent';
import type { ThinkingBlock as ThinkingBlockData } from '@franklin/agent';

import { obsidianMarkdown } from './markdown.js';
import { ObsidianWikilink } from './wikilinks/link.js';
import { remendObsidianWikilinks } from './wikilinks/remend-wikilinks.js';
import { remarkObsidianWikilinks } from './wikilinks/remark-wikilinks.js';

const MARKDOWN_CLASS =
	'markdown-rendered [font-size:calc(var(--font-text-size)*0.9)]';
const markdown = {
	...obsidianMarkdown,
	customElements: {
		'obsidian-wikilink': {
			allowedAttributes: ['linktext'],
			component: ObsidianWikilink,
		},
	},
	remend: {
		handlers: [remendObsidianWikilinks],
	},
	remarkPlugins: [remarkObsidianWikilinks],
};

export function ObsidianText({ block }: { block: TextBlockData }) {
	return (
		<TextBlock block={block} className={MARKDOWN_CLASS} markdown={markdown} />
	);
}

export function ObsidianThinking({ block }: { block: ThinkingBlockData }) {
	return (
		<ThinkingBlock
			block={block}
			className={MARKDOWN_CLASS}
			markdown={obsidianMarkdown}
		/>
	);
}
