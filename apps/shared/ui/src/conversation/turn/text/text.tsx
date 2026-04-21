import type { TextBlock as TextBlockData } from '@franklin/extensions';

import { Markdown } from '../markdown.js';

export function TextBlock({ block }: { block: TextBlockData }) {
	return (
		<div className="prose-content text-sm">
			<Markdown text={block.text} />
		</div>
	);
}
