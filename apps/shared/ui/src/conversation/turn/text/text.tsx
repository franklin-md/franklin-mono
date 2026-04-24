import type { TextBlock as TextBlockData } from '@franklin/extensions';

import { RowInset } from '../../row-inset.js';

import { Markdown } from '../markdown.js';

export function TextBlock({ block }: { block: TextBlockData }) {
	return (
		<RowInset className="text-sm">
			<Markdown text={block.text} />
		</RowInset>
	);
}
