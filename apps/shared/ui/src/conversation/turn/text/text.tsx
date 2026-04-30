import type { TextBlock as TextBlockData } from '@franklin/extensions';

import { RowInset } from '../../row-inset.js';

import { Markdown } from '../markdown.js';

export interface TextBlockProps {
	block: TextBlockData;
	className?: string;
}

export function TextBlock({ block, className }: TextBlockProps) {
	return (
		<RowInset className="text-sm">
			<Markdown text={block.text} className={className} />
		</RowInset>
	);
}
