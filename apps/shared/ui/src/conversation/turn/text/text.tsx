import type { TextBlock as TextBlockData } from '@franklin/extensions';

import { RowInset } from '../../row-inset.js';

import { Markdown, type MarkdownExtensions } from '../markdown.js';

export interface TextBlockProps {
	block: TextBlockData;
	className?: string;
	markdown?: MarkdownExtensions;
}

export function TextBlock({ block, className, markdown }: TextBlockProps) {
	return (
		<RowInset className="text-sm">
			<Markdown text={block.text} className={className} {...markdown} />
		</RowInset>
	);
}
