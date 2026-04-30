import { TextBlock, ThinkingBlock } from '@franklin/ui';

import type { TextBlock as TextBlockData } from '@franklin/extensions';
import type { ThinkingBlock as ThinkingBlockData } from '@franklin/extensions';

const MARKDOWN_CLASS = 'markdown-rendered';

export function ObsidianText({ block }: { block: TextBlockData }) {
	return <TextBlock block={block} className={MARKDOWN_CLASS} />;
}

export function ObsidianThinking({ block }: { block: ThinkingBlockData }) {
	return <ThinkingBlock block={block} className={MARKDOWN_CLASS} />;
}
