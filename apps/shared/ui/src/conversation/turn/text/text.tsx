import type { TextBlock as TextBlockData } from '@franklin/agent';

import { RowInset } from '../../row-inset.js';

import { Markdown, type MarkdownProps } from '../markdown.js';

export interface TextBlockProps {
	block: TextBlockData;
	className?: string;
	markdown?: Omit<MarkdownProps, 'text'>;
}

export function TextBlock({ block, className, markdown }: TextBlockProps) {
	return (
		<RowInset className="text-sm">
			<Markdown text={block.text} className={className} {...markdown} />
		</RowInset>
	);
}
